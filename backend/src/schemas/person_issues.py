from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from ..models.person_issue import PersonIssueSeverity, PersonIssueStatus, PersonIssueType


class CreatePersonIssueRequest(BaseModel):
    worker_id: Optional[str] = None
    level: str
    section: int
    issue_type: PersonIssueType
    observation: str
    photo_url: Optional[str] = None
    severity: PersonIssueSeverity


class UpdatePersonIssueStatusRequest(BaseModel):
    status: PersonIssueStatus


class PersonIssueResponse(BaseModel):
    id: str
    worker_id: Optional[str] = None
    mine_id: str
    source_id: Optional[str] = None
    level: str
    section: int
    issue_type: PersonIssueType
    source: str
    observation: str
    photo_url: Optional[str] = None
    severity: PersonIssueSeverity
    status: PersonIssueStatus
    created_at: datetime
    resolved_at: Optional[datetime] = None
