from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field, model_validator

from ..models.regulatory_report import (
    DirectivePriority,
    IssueKind,
    Pillar,
    RegulatoryReportStatus,
    RegulatoryReportType,
)

# A regulator's response can never be "submitted" — that status only exists on
# the corporate_submission it responds to.
RegulatoryResponseStatus = Literal["under_review", "verified", "disputed"]


# ── Request payloads ──────────────────────────────────────────────────────


class CorrectiveActionIn(BaseModel):
    issue_id: Optional[str] = None
    pillar: Pillar
    action: str
    owner: Optional[str] = None
    completed_at: Optional[datetime] = None


class DirectiveIn(BaseModel):
    text: str
    priority: DirectivePriority
    due_at: Optional[datetime] = None


class CreateRegulatoryReportRequest(BaseModel):
    mine_id: str
    period_start: datetime
    period_end: datetime
    # Optional — the server derives "September 2026" from period_start when the
    # client doesn't send one.
    period_label: Optional[str] = None
    # Per-pillar narrative text. Every metric beside these is server-computed;
    # the narrative is the only part of a section the submitter writes.
    narratives: dict[Pillar, str] = Field(default_factory=dict)
    corrective_actions: list[CorrectiveActionIn] = Field(default_factory=list)
    # Required: the submission is a certification, and an uncertified return is
    # not a thing a regulator can act on.
    declaration_statement: str
    # Used only as a fallback when no issue in the period carries a resolved_at
    # for the server to measure from.
    declared_average_resolution_time_hours: Optional[float] = None
    notes: Optional[str] = None

    @model_validator(mode="after")
    def _check_period(self) -> "CreateRegulatoryReportRequest":
        if self.period_end <= self.period_start:
            raise ValueError("period_end must be after period_start")
        return self


class RespondToRegulatoryReportRequest(BaseModel):
    status: RegulatoryResponseStatus
    findings: list[str] = Field(default_factory=list)
    directives: list[DirectiveIn] = Field(default_factory=list)
    notes: Optional[str] = None


# ── Response payloads ─────────────────────────────────────────────────────
# Mirrors of the embedded models with ObjectIds as strings; mapped by
# _to_response in routes/regulatory_reports.py.


class PillarMetricsResponse(BaseModel):
    total: int
    critical: int
    resolved: int
    open: int
    average_resolution_time_hours: Optional[float] = None


class ReportSectionResponse(BaseModel):
    pillar: Pillar
    metrics: PillarMetricsResponse
    narrative: Optional[str] = None


class LevelBreakdownResponse(BaseModel):
    level: str
    section: Optional[int] = None
    total: int
    critical: int
    open: int


class IssueSnapshotEntryResponse(BaseModel):
    issue_id: str
    kind: IssueKind
    issue_type: str
    pillar: Pillar
    severity: str
    status: str
    level: str
    section: int
    created_at: datetime
    resolved_at: Optional[datetime] = None


class CorrectiveActionResponse(BaseModel):
    issue_id: Optional[str] = None
    pillar: Pillar
    action: str
    owner: Optional[str] = None
    completed_at: Optional[datetime] = None


class DeclarationResponse(BaseModel):
    statement: str
    declared_by_user_id: str
    declared_by_name: Optional[str] = None
    signed_at: datetime


class DirectiveResponse(BaseModel):
    text: str
    priority: DirectivePriority
    due_at: Optional[datetime] = None


class RegulatorFindingsResponse(BaseModel):
    verdict: RegulatoryReportStatus
    findings: list[str] = Field(default_factory=list)
    directives: list[DirectiveResponse] = Field(default_factory=list)


class RegulatoryReportResponse(BaseModel):
    id: str
    mine_id: str
    period_start: datetime
    period_end: datetime
    period_label: str
    report_type: RegulatoryReportType
    status: RegulatoryReportStatus
    parent_report_id: Optional[str] = None
    submitted_by_user_id: str
    submitted_at: datetime
    total_safety_issues: int
    critical_issues: int
    resolved_issues: int
    open_issues: int
    average_resolution_time_hours: Optional[float] = None
    sections: list[ReportSectionResponse] = Field(default_factory=list)
    level_breakdown: list[LevelBreakdownResponse] = Field(default_factory=list)
    issue_snapshot: list[IssueSnapshotEntryResponse] = Field(default_factory=list)
    corrective_actions: list[CorrectiveActionResponse] = Field(default_factory=list)
    declaration: Optional[DeclarationResponse] = None
    regulator_findings: Optional[RegulatorFindingsResponse] = None
    notes: Optional[str] = None
