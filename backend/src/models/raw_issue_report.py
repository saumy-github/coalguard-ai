from datetime import datetime, timezone
from typing import Literal, Optional

from beanie import Document, PydanticObjectId
from pydantic import Field

RawIssueReportStatus = Literal["pending", "classified", "failed"]


class RawIssueReport(Document):
    """Durability layer for the unified issue-reporting pipeline — written
    before the AI classification call, so a report survives an ai_engine
    outage. Deleted once successfully classified into a real SiteIssue/
    PersonIssue; left at status="failed" for later retry otherwise.
    """

    source_id: str
    mine_id: PydanticObjectId
    level: str
    section: int
    observation: str
    photo_path: Optional[str] = None
    status: RawIssueReportStatus = "pending"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "raw_issue_reports"
