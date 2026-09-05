from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel

from ..models.site_issue import SiteIssueSeverity, SiteIssueStatus, SiteIssueType


class CreateSiteIssueRequest(BaseModel):
    level: str
    section: int
    issue_type: SiteIssueType
    observation: str
    severity: SiteIssueSeverity
    recommended_action: Optional[str] = None


class DetectSiteIssueRequest(BaseModel):
    level: str
    section: int
    methane: float
    co: float
    air_velocity: float
    temperature: float


class SiteIssueResponse(BaseModel):
    id: str
    mine_id: str
    level: str
    section: int
    issue_type: SiteIssueType
    source: str
    observation: str
    sensor_reading_snapshot: Optional[list[dict[str, Any]]] = None
    severity: SiteIssueSeverity
    recommended_action: Optional[str] = None
    status: SiteIssueStatus
    created_at: datetime
