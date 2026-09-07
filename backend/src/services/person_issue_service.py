from typing import Optional

from beanie import PydanticObjectId
from beanie.operators import In

from . import ai_engine_client
from ..models.person_issue import PersonIssue, PersonIssueSeverity, PersonIssueType


async def create_person_issue(
    *,
    mine_id: PydanticObjectId,
    worker_id: Optional[PydanticObjectId],
    level: str,
    section: int,
    issue_type: PersonIssueType,
    observation: str,
    photo_url: Optional[str],
    severity: PersonIssueSeverity,
    source_id: Optional[str] = None,
) -> PersonIssue:
    issue = PersonIssue(
        worker_id=worker_id,
        mine_id=mine_id,
        source_id=source_id,
        level=level,
        section=section,
        issue_type=issue_type,
        source="manual",
        observation=observation,
        photo_url=photo_url,
        severity=severity,
    )
    await issue.insert()
    return issue


async def list_person_issues(mine_id: PydanticObjectId) -> list[PersonIssue]:
    return await PersonIssue.find(PersonIssue.mine_id == mine_id).to_list()


async def list_person_issues_for_mines(mine_ids: list[PydanticObjectId]) -> list[PersonIssue]:
    """Corporate Management scope (Decision #11) — zero assigned mines must
    mean zero issues, never every mine's issues.
    """
    if not mine_ids:
        return []
    return await PersonIssue.find(In(PersonIssue.mine_id, mine_ids)).to_list()


async def list_all_person_issues() -> list[PersonIssue]:
    """Admin scope — genuinely global, no mine filter at all."""
    return await PersonIssue.find_all().to_list()


async def list_person_issues_for_worker(
    *, mine_id: PydanticObjectId, worker_id: PydanticObjectId
) -> list[PersonIssue]:
    """Server-side filtered to this worker's own issues only — Decision #9
    (research/saumy/09-changes-5-sep.md) is explicit that client-side filtering
    the mine-wide list would expose other workers' PersonIssue records.
    """
    return await PersonIssue.find(
        PersonIssue.mine_id == mine_id, PersonIssue.worker_id == worker_id
    ).to_list()


async def list_person_issues_by_source(*, mine_id: PydanticObjectId, source_id: str) -> list[PersonIssue]:
    """A worker's own submitted reports — filtered by `source_id` (the
    reporter), not `worker_id` (the offender). Deliberately distinct from
    `list_person_issues_for_worker` above; see routes/person_issues.py.
    """
    return await PersonIssue.find(
        PersonIssue.mine_id == mine_id, PersonIssue.source_id == source_id
    ).to_list()


async def create_person_issue_from_detection(
    *,
    image_bytes: bytes,
    mine_id: PydanticObjectId,
    level: str,
    section: int,
) -> Optional[PersonIssue]:
    result = await ai_engine_client.detect_ppe(image_bytes)
    if not result["violation_detected"]:
        return None

    # A single record only carries one issue_type (per 06's "keep it minimal" field
    # list, no array) — if both are missing at once, helmet takes priority since a
    # missing helmet is the more severe DGMS violation.
    issue_type: PersonIssueType = "no_helmet" if result["helmet_count"] == 0 else "no_vest"

    issue = PersonIssue(
        worker_id=None,
        mine_id=mine_id,
        level=level,
        section=section,
        issue_type=issue_type,
        source="camera",
        observation=result["violation_reason"],
        photo_url=None,
        severity="high",
    )
    await issue.insert()
    return issue
