from beanie import PydanticObjectId
from fastapi import APIRouter, Depends, HTTPException, status

from ..auth.dependencies import accessible_mine_ids, require_role
from ..models.regulatory_report import RegulatoryReport
from ..models.user import User
from ..schemas.regulatory_reports import (
    CreateRegulatoryReportRequest,
    RegulatoryReportResponse,
    RespondToRegulatoryReportRequest,
)
from ..services import regulatory_report_service

router = APIRouter(prefix="/regulatory-reports", tags=["regulatory-reports"])


def _to_response(report: RegulatoryReport) -> RegulatoryReportResponse:
    return RegulatoryReportResponse(
        id=str(report.id),
        mine_id=str(report.mine_id),
        reporting_period=report.reporting_period,
        report_type=report.report_type,
        status=report.status,
        parent_report_id=str(report.parent_report_id) if report.parent_report_id else None,
        submitted_by_user_id=str(report.submitted_by_user_id),
        submitted_at=report.submitted_at,
        total_safety_issues=report.total_safety_issues,
        critical_issues=report.critical_issues,
        resolved_issues=report.resolved_issues,
        average_resolution_time_hours=report.average_resolution_time_hours,
        notes=report.notes,
    )


@router.post("", response_model=RegulatoryReportResponse)
async def create_report(
    payload: CreateRegulatoryReportRequest,
    user: User = Depends(require_role("corporate_manager")),
) -> RegulatoryReportResponse:
    mine_id = PydanticObjectId(payload.mine_id)
    if mine_id not in await accessible_mine_ids(user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not an assigned mine")

    report = await regulatory_report_service.create_corporate_submission(
        mine_id=mine_id,
        reporting_period=payload.reporting_period,
        submitted_by_user_id=user.id,
        average_resolution_time_hours=payload.average_resolution_time_hours,
        notes=payload.notes,
    )
    return _to_response(report)


@router.post("/{report_id}/respond", response_model=RegulatoryReportResponse)
async def respond_to_report(
    report_id: str,
    payload: RespondToRegulatoryReportRequest,
    user: User = Depends(require_role("regulator")),
) -> RegulatoryReportResponse:
    target = await RegulatoryReport.get(PydanticObjectId(report_id))
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
    if target.report_type != "corporate_submission":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Can only respond to a corporate submission"
        )
    if target.mine_id not in await accessible_mine_ids(user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not an assigned mine")

    report = await regulatory_report_service.create_regulatory_verification(
        parent_report=target,
        submitted_by_user_id=user.id,
        status=payload.status,
        notes=payload.notes,
    )
    return _to_response(report)


@router.get("", response_model=list[RegulatoryReportResponse])
async def list_reports(
    user: User = Depends(require_role("corporate_manager", "regulator")),
) -> list[RegulatoryReportResponse]:
    reports = await regulatory_report_service.list_reports_for_mines(await accessible_mine_ids(user))
    return [_to_response(report) for report in reports]
