from datetime import datetime, timezone
from typing import Any, Literal, Optional

from beanie import Document, PydanticObjectId
from pydantic import Field

SiteIssueType = Literal["high_methane", "high_co", "low_ventilation", "high_temperature", "equipment_fault", "other"]
SiteIssueSource = Literal["sensor", "manual"]
SiteIssueSeverity = Literal["NORMAL", "WARNING", "CRITICAL"]  # matches ai_engine's RiskLevel vocabulary verbatim
SiteIssueStatus = Literal["open", "resolved"]


class SiteIssue(Document):
    mine_id: PydanticObjectId
    source_id: Optional[str] = None  # reporter's own user id for a manual report; null for sensor-triggered
    level: str
    section: int
    issue_type: SiteIssueType
    source: SiteIssueSource
    observation: str
    sensor_reading_snapshot: Optional[list[dict[str, Any]]] = None
    severity: SiteIssueSeverity
    recommended_action: Optional[str] = None
    photo_url: Optional[str] = None
    status: SiteIssueStatus = "open"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    # Set when `status` flips to "resolved", cleared on reopen. This is what
    # makes RegulatoryReport.average_resolution_time_hours a measurement rather
    # than a corporate declaration — see services/regulatory_report_service.py.
    # Null on every issue predating this field, so the metric must tolerate it.
    resolved_at: Optional[datetime] = None

    class Settings:
        name = "site_issues"
