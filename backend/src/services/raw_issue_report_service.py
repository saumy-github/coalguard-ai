import logging
from datetime import datetime, timezone
from typing import Optional

from beanie import PydanticObjectId
from fastapi import UploadFile

from . import ai_engine_client, person_issue_service, site_issue_service
from ..models.person_issue import PersonIssue, PersonIssueSeverity, PersonIssueType
from ..models.raw_issue_report import RawIssueReport
from ..models.site_issue import SiteIssue, SiteIssueSeverity, SiteIssueType
from ..uploads import move_to_final, save_pending_photo

logger = logging.getLogger(__name__)

_SITE_ISSUE_TYPES: set[str] = set(SiteIssueType.__args__)
_SITE_SEVERITIES: set[str] = set(SiteIssueSeverity.__args__)
_PERSON_ISSUE_TYPES: set[str] = set(PersonIssueType.__args__)
_PERSON_SEVERITIES: set[str] = set(PersonIssueSeverity.__args__)

# Defaults used only when the AI returns a target we can act on but a
# severity outside that target's vocab — never invented for issue_type,
# which always falls back to the real "other" value instead.
_SITE_SEVERITY_FALLBACK: SiteIssueSeverity = "WARNING"
_PERSON_SEVERITY_FALLBACK: PersonIssueSeverity = "medium"


async def create_issue_report(
    *,
    source_id: str,
    mine_id: PydanticObjectId,
    level: str,
    section: int,
    observation: str,
    photo: Optional[UploadFile],
) -> Optional[tuple[str, SiteIssue | PersonIssue]]:
    """Runs the manual issue-report pipeline end to end.

    Returns (target, issue) on success, or None if classification failed —
    the raw report is left behind at status="failed" for later retry either
    way, never raised as an error back to the caller (see routes/issues.py).

    Step ordering is deliberate: each step only starts once the previous one
    has fully committed, so an exception anywhere leaves the still-intact
    `RawIssueReport` (and its photo, if any) as the retryable state — never
    an orphaned file or a half-written issue.
    """
    photo_path = await save_pending_photo(photo) if photo else None

    report = RawIssueReport(
        source_id=source_id,
        mine_id=mine_id,
        level=level,
        section=section,
        observation=observation,
        photo_path=photo_path,
    )
    await report.insert()

    try:
        result = await ai_engine_client.classify_issue(observation)
        target = result.get("target")
        if target not in ("site_issue", "person_issue"):
            raise ValueError(f"Unusable classification target: {target!r}")

        issue_type = result.get("issue_type")
        severity = result.get("severity")

        if target == "site_issue":
            if issue_type not in _SITE_ISSUE_TYPES:
                issue_type = "other"
            if severity not in _SITE_SEVERITIES:
                severity = _SITE_SEVERITY_FALLBACK
            final_photo_url = move_to_final(photo_path, target=target) if photo_path else None
            issue: SiteIssue | PersonIssue = await site_issue_service.create_site_issue(
                mine_id=mine_id,
                level=level,
                section=section,
                issue_type=issue_type,
                observation=observation,
                severity=severity,
                recommended_action=None,
                source_id=source_id,
                photo_url=final_photo_url,
            )
        else:
            if issue_type not in _PERSON_ISSUE_TYPES:
                issue_type = "other"
            if severity not in _PERSON_SEVERITIES:
                severity = _PERSON_SEVERITY_FALLBACK
            final_photo_url = move_to_final(photo_path, target=target) if photo_path else None
            issue = await person_issue_service.create_person_issue(
                mine_id=mine_id,
                worker_id=None,
                level=level,
                section=section,
                issue_type=issue_type,
                observation=observation,
                photo_url=final_photo_url,
                severity=severity,
                source_id=source_id,
            )

        await report.delete()
        return target, issue

    except Exception:
        logger.warning("Issue classification failed for raw report %s", report.id, exc_info=True)
        report.status = "failed"
        report.updated_at = datetime.now(timezone.utc)
        await report.save()
        return None
