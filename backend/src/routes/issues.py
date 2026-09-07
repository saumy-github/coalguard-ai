from typing import Optional

from fastapi import APIRouter, Depends, File, Form, UploadFile

from ..auth.dependencies import require_mine_assignment, require_role
from ..models.user import User
from ..schemas.issues import IssueCreateResponse
from ..services import raw_issue_report_service
from .person_issues import to_response as person_issue_to_response
from .site_issues import to_response as site_issue_to_response

router = APIRouter(prefix="/issues", tags=["issues"])


@router.post("", response_model=IssueCreateResponse | None)
async def create_issue(
    observation: str = Form(...),
    level: str = Form(...),
    section: int = Form(...),
    photo: Optional[UploadFile] = File(None),
    user: User = Depends(require_role("worker", "safety_officer")),
) -> IssueCreateResponse | None:
    result = await raw_issue_report_service.create_issue_report(
        source_id=str(user.id),
        mine_id=await require_mine_assignment(user),
        level=level,
        section=section,
        observation=observation,
        photo=photo,
    )
    if result is None:
        # Classification failed or ai_engine is unreachable — the report is
        # safely persisted in raw_issue_reports for later retry, so this is
        # not an error response, just "nothing to show yet".
        return None

    target, issue = result
    if target == "site_issue":
        return IssueCreateResponse(target=target, issue=site_issue_to_response(issue))
    return IssueCreateResponse(target=target, issue=person_issue_to_response(issue))
