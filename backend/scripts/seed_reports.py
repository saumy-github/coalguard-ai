"""
Seed a small set of demo RegulatoryReports — a corporate submission plus a
regulator verification, for both demo mines.

Deliberately deferred until now: `research/feature-audit-6-sep.md` Section 4
held off on report seed data while the model was flat and about to be rebuilt
("seeding it now would just be thrown away later"). The structured
multi-section model (period_start/period_end, sections, level_breakdown,
issue_snapshot, corrective_actions, declaration, regulator_findings) is that
rebuild, so the condition for the deferral no longer holds.

Goes through `regulatory_report_service` rather than constructing
RegulatoryReport documents directly — a seeded report is only realistic if
it's built the exact same way a real submission would be (issue counts
computed from the real seeded SiteIssue/PersonIssue rows, not hand-typed).

Idempotent — skips if any RegulatoryReport already exists.

Exposes `seed_reports()` for `scripts/index.py` to call, and can also run
standalone:
    docker compose exec backend python -m scripts.seed_reports
"""

from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone

from src.models.regulatory_report import CorrectiveAction, Directive, RegulatoryReport
from src.models.user import User
from src.services import regulatory_report_service
from src.services.org_service import ensure_placeholder_mine, ensure_second_demo_mine


def _current_month_bounds() -> tuple[datetime, datetime]:
    """The calendar month containing "now" — so seeded reports always bracket
    whatever the seeded SiteIssue/PersonIssue rows' created_at actually is
    (they default to insert-time), regardless of which real date this script
    happens to run on. End is backed off one BSON millisecond so it stays
    inside the month rather than landing exactly on the next month's start.
    """
    now = datetime.now(timezone.utc)
    start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    if start.month == 12:
        next_month = start.replace(year=start.year + 1, month=1)
    else:
        next_month = start.replace(month=start.month + 1)
    end = next_month - timedelta(milliseconds=1)
    return start, end


async def seed_reports() -> None:
    if await RegulatoryReport.find_one():
        print("[skip] Regulatory reports already seeded")
        return

    ecl = await ensure_placeholder_mine()
    bccl = await ensure_second_demo_mine()
    corporate = await User.find_one(User.email == "corporate@example.com")
    corporate2 = await User.find_one(User.email == "corporate2@example.com")
    regulator = await User.find_one(User.email == "regulator@example.com")

    if not (corporate and corporate2 and regulator):
        print("[skip] Seed users not found yet — run seed_users() first")
        return

    period_start, period_end = _current_month_bounds()

    # ECL: a submission with narratives + one corrective action, then the
    # regulator's verification — the full two-document thread the Reports
    # pages are built to render.
    ecl_submission = await regulatory_report_service.create_corporate_submission(
        mine_id=ecl.id,
        period_start=period_start,
        period_end=period_end,
        period_label=None,
        submitted_by_user_id=corporate.id,
        submitted_by_name=corporate.full_name,
        narratives={
            "safety": (
                "One critical methane reading near the return airway (C2) prompted an "
                "immediate section evacuation and sensor recalibration; ventilation "
                "airflow at A12 remains weaker than target and is under review."
            ),
            "production": "Conveyor motor overheating at Face 4B (B7) — replacement bearing on order.",
        },
        corrective_actions=[
            CorrectiveAction(
                issue_id=None,
                pillar="safety",
                action="Scheduled additional methane sensor calibration checks across all sections.",
                owner="Mine Safety Officer",
                completed_at=None,
            ),
        ],
        declaration_statement=(
            "I certify that the information in this return is accurate and complete "
            "to the best of my knowledge."
        ),
        declared_average_resolution_time_hours=None,
        notes="Monthly compliance return for ECL Sector 7G.",
    )
    await regulatory_report_service.create_regulatory_verification(
        parent_report=ecl_submission,
        submitted_by_user_id=regulator.id,
        status="under_review",
        findings=[
            "Critical methane reading at C2 corroborated against sensor snapshot — no discrepancy found.",
            "Awaiting confirmation that the A12 ventilation weakness has been remediated.",
        ],
        directives=[
            Directive(
                text="Submit ventilation airflow readings for Level A, Section 12 within 14 days.",
                priority="mandatory",
                due_at=None,
            ),
        ],
        notes="Under review pending the requested airflow data.",
    )
    print(f"Seeded a submission + verification thread for {ecl.name}")

    # BCCL: a standalone submission, verified clean — shows a second mine and
    # a different outcome (verified vs. under_review) in the same demo.
    bccl_submission = await regulatory_report_service.create_corporate_submission(
        mine_id=bccl.id,
        period_start=period_start,
        period_end=period_end,
        period_label=None,
        submitted_by_user_id=corporate2.id,
        submitted_by_name=corporate2.full_name,
        narratives={
            "safety": "Carbon monoxide smell reported near the haulage route (B4); source traced and ventilated.",
        },
        corrective_actions=[],
        declaration_statement=(
            "I certify that the information in this return is accurate and complete "
            "to the best of my knowledge."
        ),
        declared_average_resolution_time_hours=None,
        notes="Monthly compliance return for BCCL Moonidih.",
    )
    await regulatory_report_service.create_regulatory_verification(
        parent_report=bccl_submission,
        submitted_by_user_id=regulator.id,
        status="verified",
        findings=["CO report at B4 matches manual observation log — no action required."],
        directives=[],
        notes="Verified, no outstanding directives.",
    )
    print(f"Seeded a submission + verification thread for {bccl.name}")


async def _standalone() -> None:
    from scripts.db import connect

    client = await connect()
    await seed_reports()
    client.close()


if __name__ == "__main__":
    asyncio.run(_standalone())
