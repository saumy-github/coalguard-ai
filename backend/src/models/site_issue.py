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
    level: str
    section: int
    issue_type: SiteIssueType
    source: SiteIssueSource
    observation: str
    sensor_reading_snapshot: Optional[list[dict[str, Any]]] = None
    severity: SiteIssueSeverity
    recommended_action: Optional[str] = None
    status: SiteIssueStatus = "open"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "site_issues"
