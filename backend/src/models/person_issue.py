from datetime import datetime, timezone
from typing import Literal, Optional

from beanie import Document, PydanticObjectId
from pydantic import Field

PersonIssueType = Literal["no_helmet", "no_vest", "unsafe_practice", "other"]
PersonIssueSource = Literal["camera", "manual"]
PersonIssueSeverity = Literal["low", "medium", "high", "critical"]
PersonIssueStatus = Literal["open", "resolved"]


class PersonIssue(Document):
    worker_id: Optional[PydanticObjectId] = None  # null when a camera detection can't resolve identity
    mine_id: PydanticObjectId
    level: str
    section: int
    issue_type: PersonIssueType
    source: PersonIssueSource
    observation: str
    photo_url: Optional[str] = None
    severity: PersonIssueSeverity
    status: PersonIssueStatus = "open"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "person_issues"
