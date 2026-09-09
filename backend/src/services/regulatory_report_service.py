from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Optional, Union

from beanie import PydanticObjectId
from beanie.operators import In

from ..models.person_issue import PersonIssue
from ..models.regulatory_report import (
    CorrectiveAction,
    Declaration,
    Directive,
    IssueSnapshotEntry,
    LevelBreakdown,
    Pillar,
    PillarMetrics,
    RegulatorFindings,
    RegulatoryReport,
    RegulatoryReportStatus,
    ReportSection,
)
from ..models.site_issue import SiteIssue

# Report sections are always emitted in this order, every period, even when a
# pillar is empty — a return whose sections come and go depending on what
# happened is hard to compare period-to-period.
PILLARS: tuple[Pillar, ...] = ("safety", "production", "labour")

# Neither SiteIssue nor PersonIssue carries a pillar of its own. These maps are
# the derivation, kept explicit and in one place rather than inlined as
# conditionals at the call sites.
SITE_ISSUE_PILLAR: dict[str, Pillar] = {
    "high_methane": "safety",
    "high_co": "safety",
    "low_ventilation": "safety",
    "high_temperature": "safety",
    "equipment_fault": "production",
    "other": "safety",
}
PERSON_ISSUE_PILLAR: dict[str, Pillar] = {
    "no_helmet": "safety",
    "no_vest": "safety",
    "unsafe_practice": "labour",
    "other": "labour",
}

AnyIssue = Union[SiteIssue, PersonIssue]


@dataclass
class ReportBody:
    """Everything about a report that is computed rather than declared."""

    total: int
    critical: int
    resolved: int
    open: int
    average_resolution_time_hours: Optional[float]
    sections: list[ReportSection]
    level_breakdown: list[LevelBreakdown]
    issue_snapshot: list[IssueSnapshotEntry]


def derive_period_label(period_start: datetime) -> str:
    return period_start.strftime("%B %Y")


def _is_critical(issue: AnyIssue) -> bool:
    """The same bucketing the frontend's normalizeSeverity uses
    (frontend/src/utils/safetyIssues.ts): SiteIssue CRITICAL, or PersonIssue
    high/critical. The two must not drift — a mine's issue counted as critical
    in the dashboard and non-critical in its own compliance return is exactly
    the kind of discrepancy a regulator would (rightly) treat as misreporting.
    """
    if isinstance(issue, SiteIssue):
        return issue.severity == "CRITICAL"
    return issue.severity in ("high", "critical")


def _pillar_of(issue: AnyIssue) -> Pillar:
    if isinstance(issue, SiteIssue):
        return SITE_ISSUE_PILLAR.get(issue.issue_type, "safety")
    return PERSON_ISSUE_PILLAR.get(issue.issue_type, "labour")


def _resolution_hours(issue: AnyIssue) -> Optional[float]:
    """None unless the issue actually carries a resolved_at.

    Issues resolved before `resolved_at` existed, and issues resolved by a path
    that predates it, have no measurable duration. They are excluded from the
    mean rather than counted as zero — a fabricated zero would drag the average
    down and make a mine look faster than it was.
    """
    if issue.resolved_at is None or issue.status != "resolved":
        return None
    delta = issue.resolved_at - issue.created_at
    seconds = delta.total_seconds()
    return seconds / 3600 if seconds >= 0 else None


def _mean(values: list[float]) -> Optional[float]:
    return round(sum(values) / len(values), 2) if values else None


def _metrics_for(issues: list[AnyIssue]) -> PillarMetrics:
    durations = [h for h in (_resolution_hours(i) for i in issues) if h is not None]
    resolved = sum(1 for i in issues if i.status == "resolved")
    return PillarMetrics(
        total=len(issues),
        critical=sum(1 for i in issues if _is_critical(i)),
        resolved=resolved,
        open=len(issues) - resolved,
        average_resolution_time_hours=_mean(durations),
    )


def _snapshot_entry(issue: AnyIssue) -> IssueSnapshotEntry:
    return IssueSnapshotEntry(
        issue_id=issue.id,
        kind="site" if isinstance(issue, SiteIssue) else "person",
        issue_type=issue.issue_type,
        pillar=_pillar_of(issue),
        severity=issue.severity,
        status=issue.status,
        level=issue.level,
        section=issue.section,
        created_at=issue.created_at,
        resolved_at=issue.resolved_at,
    )


async def build_report_body(
    *,
    mine_id: PydanticObjectId,
    period_start: datetime,
    period_end: datetime,
) -> ReportBody:
    """Every computed figure on a report, scoped to [period_start, period_end].

    The period scoping is the point. The previous version of this function took
    only a mine_id and counted every issue ever recorded there, so a September
    report and an October report for the same mine were numerically identical
    and the `reporting_period` label they carried was decorative.
    """
    site_issues = await SiteIssue.find(
        SiteIssue.mine_id == mine_id,
        SiteIssue.created_at >= period_start,
        SiteIssue.created_at <= period_end,
    ).to_list()
    person_issues = await PersonIssue.find(
        PersonIssue.mine_id == mine_id,
        PersonIssue.created_at >= period_start,
        PersonIssue.created_at <= period_end,
    ).to_list()

    issues: list[AnyIssue] = [*site_issues, *person_issues]

    issues_by_pillar: dict[Pillar, list[AnyIssue]] = {pillar: [] for pillar in PILLARS}
    for issue in issues:
        issues_by_pillar[_pillar_of(issue)].append(issue)

    sections = [
        ReportSection(pillar=pillar, metrics=_metrics_for(issues_by_pillar[pillar]))
        for pillar in PILLARS
    ]

    # Grouped by (level, section) and sorted for stable rendering. Levels are
    # sorted as strings because MineLevel.level is a free-text label ("L1",
    # "Surface") with no guaranteed numeric ordering.
    buckets: dict[tuple[str, int], list[AnyIssue]] = {}
    for issue in issues:
        buckets.setdefault((issue.level, issue.section), []).append(issue)

    level_breakdown = [
        LevelBreakdown(
            level=level,
            section=section,
            total=len(bucket),
            critical=sum(1 for i in bucket if _is_critical(i)),
            open=sum(1 for i in bucket if i.status != "resolved"),
        )
        for (level, section), bucket in sorted(buckets.items())
    ]

    resolved = sum(1 for i in issues if i.status == "resolved")
    durations = [h for h in (_resolution_hours(i) for i in issues) if h is not None]

    return ReportBody(
        total=len(issues),
        critical=sum(1 for i in issues if _is_critical(i)),
        resolved=resolved,
        open=len(issues) - resolved,
        average_resolution_time_hours=_mean(durations),
        sections=sections,
        level_breakdown=level_breakdown,
        issue_snapshot=[_snapshot_entry(i) for i in sorted(issues, key=lambda i: i.created_at)],
    )


def _apply_narratives(sections: list[ReportSection], narratives: dict[str, str]) -> list[ReportSection]:
    """Narratives are the only part of a section the submitter authors — the
    metrics beside them are never client-supplied.
    """
    for section in sections:
        text = narratives.get(section.pillar)
        if text and text.strip():
            section.narrative = text.strip()
    return sections


async def create_corporate_submission(
    *,
    mine_id: PydanticObjectId,
    period_start: datetime,
    period_end: datetime,
    period_label: Optional[str],
    submitted_by_user_id: PydanticObjectId,
    submitted_by_name: Optional[str],
    narratives: dict[str, str],
    corrective_actions: list[CorrectiveAction],
    declaration_statement: str,
    declared_average_resolution_time_hours: Optional[float],
    notes: Optional[str],
) -> RegulatoryReport:
    body = await build_report_body(
        mine_id=mine_id, period_start=period_start, period_end=period_end
    )

    # Prefer the measured figure; fall back to the corporate manager's declared
    # one only when nothing in the period has a resolved_at to measure from.
    average_resolution = body.average_resolution_time_hours
    if average_resolution is None:
        average_resolution = declared_average_resolution_time_hours

    report = RegulatoryReport(
        mine_id=mine_id,
        period_start=period_start,
        period_end=period_end,
        period_label=period_label or derive_period_label(period_start),
        report_type="corporate_submission",
        status="submitted",
        submitted_by_user_id=submitted_by_user_id,
        total_safety_issues=body.total,
        critical_issues=body.critical,
        resolved_issues=body.resolved,
        open_issues=body.open,
        average_resolution_time_hours=average_resolution,
        sections=_apply_narratives(body.sections, narratives),
        level_breakdown=body.level_breakdown,
        issue_snapshot=body.issue_snapshot,
        corrective_actions=corrective_actions,
        declaration=Declaration(
            statement=declaration_statement,
            declared_by_user_id=submitted_by_user_id,
            declared_by_name=submitted_by_name,
            signed_at=datetime.now(timezone.utc),
        ),
        notes=notes,
    )
    await report.insert()
    return report


async def create_regulatory_verification(
    *,
    parent_report: RegulatoryReport,
    submitted_by_user_id: PydanticObjectId,
    status: RegulatoryReportStatus,
    findings: list[str],
    directives: list[Directive],
    notes: Optional[str],
) -> RegulatoryReport:
    """The regulator's response. Recomputes every figure from live records
    rather than copying the parent's — that independent recomputation is the
    substance of a verification. If the mine's submission overstated its
    resolved count, the verification will not agree with it.

    Carries no `declaration`: the certification belongs to whoever submitted
    the return, and a regulator does not re-sign the operator's declaration.
    """
    body = await build_report_body(
        mine_id=parent_report.mine_id,
        period_start=parent_report.period_start,
        period_end=parent_report.period_end,
    )

    report = RegulatoryReport(
        mine_id=parent_report.mine_id,
        period_start=parent_report.period_start,
        period_end=parent_report.period_end,
        period_label=parent_report.period_label,
        report_type="regulatory_verification",
        status=status,
        parent_report_id=parent_report.id,
        submitted_by_user_id=submitted_by_user_id,
        total_safety_issues=body.total,
        critical_issues=body.critical,
        resolved_issues=body.resolved,
        open_issues=body.open,
        average_resolution_time_hours=body.average_resolution_time_hours,
        sections=body.sections,
        level_breakdown=body.level_breakdown,
        issue_snapshot=body.issue_snapshot,
        regulator_findings=RegulatorFindings(
            verdict=status, findings=findings, directives=directives
        ),
        notes=notes,
    )
    await report.insert()
    return report


async def get_report(report_id: PydanticObjectId) -> Optional[RegulatoryReport]:
    return await RegulatoryReport.get(report_id)


async def list_reports_for_mines(mine_ids: list[PydanticObjectId]) -> list[RegulatoryReport]:
    if not mine_ids:
        return []
    reports = await RegulatoryReport.find(In(RegulatoryReport.mine_id, mine_ids)).to_list()
    reports.sort(key=lambda r: r.submitted_at, reverse=True)
    return reports
