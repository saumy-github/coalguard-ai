from fastapi import APIRouter, Depends

from ..auth.dependencies import require_mine_scope, require_user_types
from ..models.site_issue import SiteIssue
from ..models.user import User
from ..schemas.site_issues import CreateSiteIssueRequest, DetectSiteIssueRequest, SiteIssueResponse
from ..services import site_issue_service

router = APIRouter(prefix="/site-issues", tags=["site-issues"])


def _to_response(issue: SiteIssue) -> SiteIssueResponse:
    return SiteIssueResponse(
        id=str(issue.id),
        mine_id=str(issue.mine_id),
        level=issue.level,
        section=issue.section,
        issue_type=issue.issue_type,
        source=issue.source,
        observation=issue.observation,
        sensor_reading_snapshot=issue.sensor_reading_snapshot,
        severity=issue.severity,
        recommended_action=issue.recommended_action,
        status=issue.status,
        created_at=issue.created_at,
    )


@router.post("", response_model=SiteIssueResponse)
async def create_site_issue(
    payload: CreateSiteIssueRequest,
    user: User = Depends(require_user_types("worker", "mine_safety_officer")),
) -> SiteIssueResponse:
    issue = await site_issue_service.create_site_issue(
        mine_id=require_mine_scope(user),
        level=payload.level,
        section=payload.section,
        issue_type=payload.issue_type,
        observation=payload.observation,
        severity=payload.severity,
        recommended_action=payload.recommended_action,
    )
    return _to_response(issue)


@router.get("", response_model=list[SiteIssueResponse])
async def list_site_issues(
    user: User = Depends(require_user_types("worker", "mine_safety_officer")),
) -> list[SiteIssueResponse]:
    issues = await site_issue_service.list_site_issues(require_mine_scope(user))
    return [_to_response(issue) for issue in issues]


@router.post("/detect", response_model=SiteIssueResponse | None)
async def detect_site_issue(
    payload: DetectSiteIssueRequest,
    user: User = Depends(require_user_types("worker", "mine_safety_officer")),
) -> SiteIssueResponse | None:
    issue = await site_issue_service.create_site_issue_from_reading(
        mine_id=require_mine_scope(user),
        level=payload.level,
        section=payload.section,
        methane=payload.methane,
        co=payload.co,
        air_velocity=payload.air_velocity,
        temperature=payload.temperature,
    )
    return _to_response(issue) if issue else None
