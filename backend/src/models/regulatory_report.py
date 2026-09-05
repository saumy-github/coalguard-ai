from datetime import datetime, timezone
from typing import Literal, Optional

from beanie import Document, PydanticObjectId
from pydantic import Field

RegulatoryReportType = Literal["corporate_submission", "regulatory_verification"]
RegulatoryReportStatus = Literal["submitted", "under_review", "verified", "disputed"]


class RegulatoryReport(Document):
    """Phase 7's trimmed slice of Decision #13 (research/saumy/
    09-changes-5-sep.md) — the two-party report/verification loop only.
    `regulatory_actions`/`regulatory_action_evidence` and the audit ledger are
    deliberately not built yet.

    Never mutated after creation. A verification is a new document linking
    back via `parent_report_id`, never an update to the report it responds
    to — "current status" for a mine+reporting_period is always whichever
    report is most recent in that chain, computed by the caller, not stored.
    """

    mine_id: PydanticObjectId
    reporting_period: str  # free-text label, e.g. "September 2026" — not a real date-range query filter yet
    report_type: RegulatoryReportType
    status: RegulatoryReportStatus
    parent_report_id: Optional[PydanticObjectId] = None
    submitted_by_user_id: PydanticObjectId
    submitted_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    # Server-computed from real SiteIssue/PersonIssue records at submission
    # time — never client-supplied (see services/regulatory_report_service.py).
    total_safety_issues: int
    critical_issues: int
    resolved_issues: int
    # Corporate-declared only (Decision #13) — no real corrective-action
    # workflow exists yet to measure this from recorded timestamps.
    average_resolution_time_hours: Optional[float] = None
    notes: Optional[str] = None  # corporate's declaration text, or the regulator's findings

    class Settings:
        name = "regulatory_reports"
