from typing import Literal

from pydantic import BaseModel

from .person_issues import PersonIssueResponse
from .site_issues import SiteIssueResponse


class IssueCreateResponse(BaseModel):
    target: Literal["site_issue", "person_issue"]
    issue: SiteIssueResponse | PersonIssueResponse
