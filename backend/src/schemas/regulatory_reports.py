from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel

from ..models.regulatory_report import RegulatoryReportStatus, RegulatoryReportType

# A regulator's response can never be "submitted" — that status only exists on
# the corporate_submission it responds to.
RegulatoryResponseStatus = Literal["under_review", "verified", "disputed"]


class CreateRegulatoryReportRequest(BaseModel):
    mine_id: str
    reporting_period: str
    average_resolution_time_hours: Optional[float] = None
    notes: Optional[str] = None


class RespondToRegulatoryReportRequest(BaseModel):
    status: RegulatoryResponseStatus
    notes: Optional[str] = None


class RegulatoryReportResponse(BaseModel):
    id: str
    mine_id: str
    reporting_period: str
    report_type: RegulatoryReportType
    status: RegulatoryReportStatus
    parent_report_id: Optional[str] = None
    submitted_by_user_id: str
    submitted_at: datetime
    total_safety_issues: int
    critical_issues: int
    resolved_issues: int
    average_resolution_time_hours: Optional[float] = None
    notes: Optional[str] = None
