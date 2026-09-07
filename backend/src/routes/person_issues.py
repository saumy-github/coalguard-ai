from fastapi import APIRouter, Depends, File, Form, UploadFile

from ..auth.dependencies import accessible_mine_ids, require_mine_assignment, require_role
from ..models.person_issue import PersonIssue
from ..models.user import User
from ..schemas.person_issues import PersonIssueResponse
from ..services import person_issue_service

router = APIRouter(prefix="/person-issues", tags=["person-issues"])


def to_response(issue: PersonIssue) -> PersonIssueResponse:
    return PersonIssueResponse(
        id=str(issue.id),
        worker_id=str(issue.worker_id) if issue.worker_id else None,
        mine_id=str(issue.mine_id),
        source_id=issue.source_id,
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


@router.get("", response_model=list[PersonIssueResponse])
async def list_person_issues(
    user: User = Depends(require_role("worker", "safety_officer", "corporate_manager", "regulator", "admin")),
) -> list[PersonIssueResponse]:
    if user.role == "admin":
        issues = await person_issue_service.list_all_person_issues()
    elif user.role in ("corporate_manager", "regulator"):
        issues = await person_issue_service.list_person_issues_for_mines(await accessible_mine_ids(user))
    elif user.role == "worker":
        # Scoped to their own submitted reports (source_id), not denied
        # outright — GET /person-issues/me below is a different, separate
        # thing (issues *about* them, filtered by worker_id).
        issues = await person_issue_service.list_person_issues_by_source(
            mine_id=await require_mine_assignment(user), source_id=str(user.id)
        )
    else:
        issues = await person_issue_service.list_person_issues(await require_mine_assignment(user))
    return [to_response(issue) for issue in issues]


@router.get("/me", response_model=list[PersonIssueResponse])
async def list_my_person_issues(
    user: User = Depends(require_role("worker")),
) -> list[PersonIssueResponse]:
    issues = await person_issue_service.list_person_issues_for_worker(
        mine_id=await require_mine_assignment(user), worker_id=user.id
    )
    return [to_response(issue) for issue in issues]


@router.post("/detect", response_model=PersonIssueResponse | None)
async def detect_person_issue(
    level: str = Form(...),
    section: int = Form(...),
    file: UploadFile = File(...),
    user: User = Depends(require_role("worker", "safety_officer")),
) -> PersonIssueResponse | None:
    image_bytes = await file.read()
    issue = await person_issue_service.create_person_issue_from_detection(
        image_bytes=image_bytes,
        mine_id=await require_mine_assignment(user),
        level=level,
        section=section,
    )
    return to_response(issue) if issue else None
