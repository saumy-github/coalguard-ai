from typing import Optional

from beanie import PydanticObjectId
from beanie.operators import In

from ..models.person_issue import PersonIssue
from ..models.regulatory_report import RegulatoryReport, RegulatoryReportStatus
from ..models.site_issue import SiteIssue


async def _compute_issue_counts(mine_id: PydanticObjectId) -> tuple[int, int, int]:
    """total, critical, resolved — computed fresh from real SiteIssue/
    PersonIssue records, same "critical" bucketing as the frontend's
    normalizeSeverity (utils/safetyIssues.ts): SiteIssue CRITICAL, or
    PersonIssue high/critical.
    """
    site_issues = await SiteIssue.find(SiteIssue.mine_id == mine_id).to_list()
    person_issues = await PersonIssue.find(PersonIssue.mine_id == mine_id).to_list()

    total = len(site_issues) + len(person_issues)
    critical = sum(1 for i in site_issues if i.severity == "CRITICAL") + sum(
        1 for i in person_issues if i.severity in ("high", "critical")
    )
    resolved = sum(1 for i in site_issues if i.status == "resolved") + sum(
        1 for i in person_issues if i.status == "resolved"
    )
    return total, critical, resolved


async def create_corporate_submission(
    *,
    mine_id: PydanticObjectId,
    reporting_period: str,
    submitted_by_user_id: PydanticObjectId,
    average_resolution_time_hours: Optional[float],
    notes: Optional[str],
) -> RegulatoryReport:
    total, critical, resolved = await _compute_issue_counts(mine_id)
    report = RegulatoryReport(
        mine_id=mine_id,
        reporting_period=reporting_period,
        report_type="corporate_submission",
        status="submitted",
        submitted_by_user_id=submitted_by_user_id,
        total_safety_issues=total,
        critical_issues=critical,
        resolved_issues=resolved,
        average_resolution_time_hours=average_resolution_time_hours,
        notes=notes,
    )
    await report.insert()
    return report


async def create_regulatory_verification(
    *,
    parent_report: RegulatoryReport,
    submitted_by_user_id: PydanticObjectId,
    status: RegulatoryReportStatus,
    notes: Optional[str],
) -> RegulatoryReport:
    total, critical, resolved = await _compute_issue_counts(parent_report.mine_id)
    report = RegulatoryReport(
        mine_id=parent_report.mine_id,
        reporting_period=parent_report.reporting_period,
        report_type="regulatory_verification",
        status=status,
        parent_report_id=parent_report.id,
        submitted_by_user_id=submitted_by_user_id,
        total_safety_issues=total,
        critical_issues=critical,
        resolved_issues=resolved,
        notes=notes,
    )
    await report.insert()
    return report


async def list_reports_for_mines(mine_ids: list[PydanticObjectId]) -> list[RegulatoryReport]:
    if not mine_ids:
        return []
    reports = await RegulatoryReport.find(In(RegulatoryReport.mine_id, mine_ids)).to_list()
    reports.sort(key=lambda r: r.submitted_at, reverse=True)
    return reports
