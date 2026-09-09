import re

from beanie import PydanticObjectId
from fastapi import APIRouter, Depends, HTTPException, Response, status

from ..auth.dependencies import accessible_mine_ids, require_role
from ..models.mine import Mine
from ..models.regulatory_report import (
    CorrectiveAction,
    Directive,
    IssueSnapshotEntry,
    LevelBreakdown,
    RegulatoryReport,
    ReportSection,
)
from ..models.user import User
from ..schemas.regulatory_reports import (
    CorrectiveActionIn,
    CorrectiveActionResponse,
    CreateRegulatoryReportRequest,
    DeclarationResponse,
    DirectiveIn,
    DirectiveResponse,
    IssueSnapshotEntryResponse,
    LevelBreakdownResponse,
    PillarMetricsResponse,
    RegulatorFindingsResponse,
    RegulatoryReportResponse,
    ReportSectionResponse,
    RespondToRegulatoryReportRequest,
)
from ..services import regulatory_report_service, report_pdf_service

router = APIRouter(prefix="/regulatory-reports", tags=["regulatory-reports"])


def _section_to_response(section: ReportSection) -> ReportSectionResponse:
    return ReportSectionResponse(
        pillar=section.pillar,
        metrics=PillarMetricsResponse(**section.metrics.model_dump()),
        narrative=section.narrative,
    )


def _level_to_response(entry: LevelBreakdown) -> LevelBreakdownResponse:
    return LevelBreakdownResponse(**entry.model_dump())


def _snapshot_to_response(entry: IssueSnapshotEntry) -> IssueSnapshotEntryResponse:
    return IssueSnapshotEntryResponse(
        issue_id=str(entry.issue_id),
        kind=entry.kind,
        issue_type=entry.issue_type,
        pillar=entry.pillar,
        severity=entry.severity,
        status=entry.status,
        level=entry.level,
        section=entry.section,
        created_at=entry.created_at,
        resolved_at=entry.resolved_at,
    )


def _action_to_response(action: CorrectiveAction) -> CorrectiveActionResponse:
    return CorrectiveActionResponse(
        issue_id=str(action.issue_id) if action.issue_id else None,
        pillar=action.pillar,
        action=action.action,
        owner=action.owner,
        completed_at=action.completed_at,
    )


def _to_response(report: RegulatoryReport) -> RegulatoryReportResponse:
    return RegulatoryReportResponse(
        id=str(report.id),
        mine_id=str(report.mine_id),
        period_start=report.period_start,
        period_end=report.period_end,
        period_label=report.period_label,
        report_type=report.report_type,
        status=report.status,
        parent_report_id=str(report.parent_report_id) if report.parent_report_id else None,
        submitted_by_user_id=str(report.submitted_by_user_id),
        submitted_at=report.submitted_at,
        total_safety_issues=report.total_safety_issues,
        critical_issues=report.critical_issues,
        resolved_issues=report.resolved_issues,
        open_issues=report.open_issues,
        average_resolution_time_hours=report.average_resolution_time_hours,
        sections=[_section_to_response(s) for s in report.sections],
        level_breakdown=[_level_to_response(entry) for entry in report.level_breakdown],
        issue_snapshot=[_snapshot_to_response(entry) for entry in report.issue_snapshot],
        corrective_actions=[_action_to_response(a) for a in report.corrective_actions],
        declaration=(
            DeclarationResponse(
                statement=report.declaration.statement,
                declared_by_user_id=str(report.declaration.declared_by_user_id),
                declared_by_name=report.declaration.declared_by_name,
                signed_at=report.declaration.signed_at,
            )
            if report.declaration
            else None
        ),
        regulator_findings=(
            RegulatorFindingsResponse(
                verdict=report.regulator_findings.verdict,
                findings=report.regulator_findings.findings,
                directives=[
                    DirectiveResponse(**d.model_dump())
                    for d in report.regulator_findings.directives
                ],
            )
            if report.regulator_findings
            else None
        ),
        notes=report.notes,
    )


def _to_corrective_action(payload: CorrectiveActionIn) -> CorrectiveAction:
    return CorrectiveAction(
        issue_id=PydanticObjectId(payload.issue_id) if payload.issue_id else None,
        pillar=payload.pillar,
        action=payload.action,
        owner=payload.owner,
        completed_at=payload.completed_at,
    )


def _to_directive(payload: DirectiveIn) -> Directive:
    return Directive(text=payload.text, priority=payload.priority, due_at=payload.due_at)


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
        period_start=payload.period_start,
        period_end=payload.period_end,
        period_label=payload.period_label,
        submitted_by_user_id=user.id,
        submitted_by_name=user.full_name,
        narratives=payload.narratives,
        corrective_actions=[_to_corrective_action(a) for a in payload.corrective_actions],
        declaration_statement=payload.declaration_statement,
        declared_average_resolution_time_hours=payload.declared_average_resolution_time_hours,
        notes=payload.notes,
    )
    return _to_response(report)


@router.post("/{report_id}/respond", response_model=RegulatoryReportResponse)
async def respond_to_report(
    report_id: str,
    payload: RespondToRegulatoryReportRequest,
    user: User = Depends(require_role("regulator")),
) -> RegulatoryReportResponse:
    target = await regulatory_report_service.get_report(PydanticObjectId(report_id))
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
        findings=payload.findings,
        directives=[_to_directive(d) for d in payload.directives],
        notes=payload.notes,
    )
    return _to_response(report)


@router.get("", response_model=list[RegulatoryReportResponse])
async def list_reports(
    user: User = Depends(require_role("corporate_manager", "regulator")),
) -> list[RegulatoryReportResponse]:
    reports = await regulatory_report_service.list_reports_for_mines(await accessible_mine_ids(user))
    return [_to_response(report) for report in reports]


def _pdf_filename(mine_name: str, report: RegulatoryReport) -> str:
    slug = re.sub(r"[^A-Za-z0-9]+", "-", f"{mine_name}-{report.period_label}-{report.report_type}").strip("-")
    return f"{slug}.pdf"


async def _load_report_or_403(report_id: str, user: User) -> RegulatoryReport:
    report = await regulatory_report_service.get_report(PydanticObjectId(report_id))
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
    if report.mine_id not in await accessible_mine_ids(user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not an assigned mine")
    return report


@router.get("/{report_id}/pdf")
async def download_report_pdf(
    report_id: str,
    user: User = Depends(require_role("corporate_manager", "regulator")),
) -> Response:
    report = await _load_report_or_403(report_id, user)

    mine = await Mine.get(report.mine_id)
    mine_name = mine.name if mine else "Unknown Mine"

    if report.declaration:
        submitted_by_name = report.declaration.declared_by_name
    else:
        submitter = await User.get(report.submitted_by_user_id)
        submitted_by_name = submitter.full_name if submitter else None

    parent_period_label = None
    if report.parent_report_id:
        parent = await regulatory_report_service.get_report(report.parent_report_id)
        parent_period_label = parent.period_label if parent else None

    pdf_bytes = report_pdf_service.generate_report_pdf(
        report,
        mine_name=mine_name,
        submitted_by_name=submitted_by_name,
        parent_period_label=parent_period_label,
    )
    filename = _pdf_filename(mine_name, report)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# Declared last: a bare "/{report_id}" would otherwise shadow any literal-segment
# GET route added above it.
@router.get("/{report_id}", response_model=RegulatoryReportResponse)
async def get_report(
    report_id: str,
    user: User = Depends(require_role("corporate_manager", "regulator")),
) -> RegulatoryReportResponse:
    return _to_response(await _load_report_or_403(report_id, user))
