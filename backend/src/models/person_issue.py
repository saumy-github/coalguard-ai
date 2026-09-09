from datetime import datetime, timezone
from typing import Literal, Optional

from beanie import Document, PydanticObjectId
from pydantic import Field

PersonIssueType = Literal["no_helmet", "no_vest", "other"]
PersonIssueSource = Literal["camera", "manual"]
PersonIssueSeverity = Literal["low", "medium", "high", "critical"]
PersonIssueStatus = Literal["open", "resolved"]


class PersonIssue(Document):
    worker_id: Optional[PydanticObjectId] = None  # the offender; null when identity can't be resolved
    mine_id: PydanticObjectId
    source_id: Optional[str] = None  # reporter's own user id for a manual report; null for camera detections
    level: str
    section: int
    issue_type: PersonIssueType
    source: PersonIssueSource
    observation: str
    photo_url: Optional[str] = None
    severity: PersonIssueSeverity
    status: PersonIssueStatus = "open"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    # Set when `status` flips to "resolved", cleared on reopen — same contract
    # as SiteIssue.resolved_at, and read by the same report aggregator.
    resolved_at: Optional[datetime] = None

    class Settings:
        name = "person_issues"
