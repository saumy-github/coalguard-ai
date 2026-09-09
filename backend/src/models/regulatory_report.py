from datetime import datetime, timezone
from typing import Literal, Optional

from beanie import Document, PydanticObjectId
from pydantic import BaseModel, Field

# Owned here now, not imported from a since-removed Inspection model.
# `environment` was dropped along with Inspection removal — it had no
# SiteIssue/PersonIssue type mapped to it and existed solely to hold
# inspection-observation counts (see git history if that ever needs reviving).
Pillar = Literal["safety", "production", "labour"]

RegulatoryReportType = Literal["corporate_submission", "regulatory_verification"]
RegulatoryReportStatus = Literal["submitted", "under_review", "verified", "disputed"]
IssueKind = Literal["site", "person"]
DirectivePriority = Literal["advisory", "mandatory", "immediate"]


class PillarMetrics(BaseModel):
    total: int
    critical: int
    resolved: int
    open: int
    # Measured from resolved_at - created_at over the issues in this pillar and
    # period. None when nothing in the pillar has a resolved_at — which is the
    # honest answer, not zero.
    average_resolution_time_hours: Optional[float] = None


class ReportSection(BaseModel):
    """One per pillar. Metrics are server-computed; the narrative is the
    corporate manager's own account of them and is the only part they author.
    """

    pillar: Pillar
    metrics: PillarMetrics
    narrative: Optional[str] = None


class LevelBreakdown(BaseModel):
    level: str
    section: Optional[int] = None
    total: int
    critical: int
    open: int


class IssueSnapshotEntry(BaseModel):
    """A frozen copy of one issue as it stood at submission.

    The report has to stay readable and auditable after the underlying issue is
    edited, resolved, or the mine's levels are restructured — a report that
    silently restates today's numbers when you open it next year is not a
    record of anything. `severity` is stored verbatim from the source model
    (SiteIssue's UPPERCASE vocabulary or PersonIssue's lowercase one), not
    normalised, so the snapshot never loses information the original had.
    """

    issue_id: PydanticObjectId
    kind: IssueKind
    issue_type: str
    pillar: Pillar
    severity: str
    status: str
    level: str
    section: int
    created_at: datetime
    resolved_at: Optional[datetime] = None


class CorrectiveAction(BaseModel):
    """Corporate-declared CAPA. `issue_id` is nullable because some corrective
    action is programme-wide (a training rollout, a ventilation upgrade) rather
    than a response to one recorded issue.
    """

    issue_id: Optional[PydanticObjectId] = None
    pillar: Pillar
    action: str
    owner: Optional[str] = None
    completed_at: Optional[datetime] = None


class Declaration(BaseModel):
    """The legal weight of the submission — the corporate manager certifying
    the return is accurate. This is the field the audit ledger exists to make
    un-editable after the fact.
    """

    statement: str
    declared_by_user_id: PydanticObjectId
    declared_by_name: Optional[str] = None
    signed_at: datetime


class Directive(BaseModel):
    text: str
    priority: DirectivePriority
    due_at: Optional[datetime] = None


class RegulatorFindings(BaseModel):
    """Only ever present on a regulatory_verification. `verdict` duplicates the
    document's own `status` so the findings block is self-contained when read
    on its own.
    """

    verdict: RegulatoryReportStatus
    findings: list[str] = Field(default_factory=list)
    directives: list[Directive] = Field(default_factory=list)


class RegulatoryReport(Document):
    """A periodic compliance return from Corporate Management to the Regulatory
    Authority, and the Authority's response to it.

    Never mutated after creation. A verification is a new document linking back
    via `parent_report_id`, never an update to the report it responds to —
    "current status" for a mine+period is always whichever report is most
    recent in that chain, computed by the caller, not stored.

    Supersedes Phase 7's flat three-counter version (Decision #13,
    research/saumy/09-changes-5-sep.md). That version also carried a real bug:
    `reporting_period` was a free-text label the aggregator ignored entirely,
    so every report for a mine reported identical all-time counts regardless of
    the period it claimed to cover. `period_start`/`period_end` replace it and
    are what the counts are actually scoped by.
    """

    mine_id: PydanticObjectId
    period_start: datetime
    period_end: datetime
    # Display only, e.g. "September 2026". Derived from period_start when the
    # client doesn't supply one. Threads are grouped by (mine_id, period_label),
    # and a verification copies its parent's label verbatim.
    period_label: str
    report_type: RegulatoryReportType
    status: RegulatoryReportStatus
    parent_report_id: Optional[PydanticObjectId] = None
    submitted_by_user_id: PydanticObjectId
    submitted_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    # Rollups across every section. Kept top-level (rather than only inside
    # `sections`) because the dashboards and the frontend's RegulatoryReport
    # type read them directly. Server-computed from real SiteIssue/PersonIssue
    # records inside [period_start, period_end] — never client-supplied.
    total_safety_issues: int
    critical_issues: int
    resolved_issues: int
    open_issues: int
    # Measured from resolved_at where available. Falls back to the corporate
    # manager's declared figure only when no issue in the period has a
    # resolved_at — see services/regulatory_report_service.py.
    average_resolution_time_hours: Optional[float] = None

    sections: list[ReportSection] = Field(default_factory=list)
    level_breakdown: list[LevelBreakdown] = Field(default_factory=list)
    issue_snapshot: list[IssueSnapshotEntry] = Field(default_factory=list)
    corrective_actions: list[CorrectiveAction] = Field(default_factory=list)
    # Present on a corporate_submission, absent on a verification.
    declaration: Optional[Declaration] = None
    # Present on a regulatory_verification, absent on a submission.
    regulator_findings: Optional[RegulatorFindings] = None
    notes: Optional[str] = None

    class Settings:
        name = "regulatory_reports"
