from beanie import PydanticObjectId
from fastapi import APIRouter, Depends, File, Form, UploadFile

from ..auth.dependencies import require_mine_scope, require_user_types
from ..models.person_issue import PersonIssue
from ..models.user import User
from ..schemas.person_issues import CreatePersonIssueRequest, PersonIssueResponse
from ..services import person_issue_service

router = APIRouter(prefix="/person-issues", tags=["person-issues"])


def _to_response(issue: PersonIssue) -> PersonIssueResponse:
    return PersonIssueResponse(
        id=str(issue.id),
        worker_id=str(issue.worker_id) if issue.worker_id else None,
        mine_id=str(issue.mine_id),
        level=issue.level,
        section=issue.section,
        issue_type=issue.issue_type,
        source=issue.source,
        observation=issue.observation,
        photo_url=issue.photo_url,
        severity=issue.severity,
        status=issue.status,
        created_at=issue.created_at,
    )


@router.post("", response_model=PersonIssueResponse)
async def create_person_issue(
    payload: CreatePersonIssueRequest,
    user: User = Depends(require_user_types("mine_safety_officer")),
) -> PersonIssueResponse:
    issue = await person_issue_service.create_person_issue(
        mine_id=require_mine_scope(user),
        worker_id=PydanticObjectId(payload.worker_id) if payload.worker_id else None,
        level=payload.level,
        section=payload.section,
        issue_type=payload.issue_type,
        observation=payload.observation,
        photo_url=payload.photo_url,
        severity=payload.severity,
    )
    return _to_response(issue)


@router.get("", response_model=list[PersonIssueResponse])
async def list_person_issues(
    user: User = Depends(require_user_types("worker", "mine_safety_officer")),
) -> list[PersonIssueResponse]:
    issues = await person_issue_service.list_person_issues(require_mine_scope(user))
    return [_to_response(issue) for issue in issues]


@router.post("/detect", response_model=PersonIssueResponse | None)
async def detect_person_issue(
    level: str = Form(...),
    section: int = Form(...),
    file: UploadFile = File(...),
    user: User = Depends(require_user_types("worker", "mine_safety_officer")),
) -> PersonIssueResponse | None:
    image_bytes = await file.read()
    issue = await person_issue_service.create_person_issue_from_detection(
        image_bytes=image_bytes,
        mine_id=require_mine_scope(user),
        level=level,
        section=section,
    )
    return _to_response(issue) if issue else None
