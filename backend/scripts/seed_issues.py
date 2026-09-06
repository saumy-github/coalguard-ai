"""
Seed a small, fixed set of demo Site/Person Issues across both demo mines.

Idempotent — skips if any SiteIssue/PersonIssue already exists, so a re-run
never duplicates these.

Exposes `seed_issues()` for `scripts/index.py` to call, and can also run standalone:
    docker compose exec backend python -m scripts.seed_issues
"""

from __future__ import annotations

import asyncio

from src.models.person_issue import PersonIssue
from src.models.site_issue import SiteIssue
from src.models.user import User
from src.services.org_service import ensure_placeholder_mine, ensure_second_demo_mine


async def seed_issues() -> None:
    if await SiteIssue.find_one() or await PersonIssue.find_one():
        print("[skip] Issues already seeded")
        return

    ecl = await ensure_placeholder_mine()
    bccl = await ensure_second_demo_mine()
    worker = await User.find_one(User.role == "worker")

    site_issues = [
        {
            "mine_id": ecl.id, "level": "B", "section": 7,
            "issue_type": "equipment_fault", "source": "manual",
            "observation": "Conveyor belt motor overheating at Face 4B.",
            "severity": "WARNING",
        },
        {
            "mine_id": ecl.id, "level": "C", "section": 2,
            "issue_type": "high_methane", "source": "sensor",
            "observation": "Methane sensor reading above threshold near ventilation duct.",
            "severity": "CRITICAL",
        },
        {
            "mine_id": ecl.id, "level": "A", "section": 12,
            "issue_type": "low_ventilation", "source": "manual",
            "observation": "Airflow noticeably weak near the return airway.",
            "severity": "WARNING",
        },
        {
            "mine_id": bccl.id, "level": "B", "section": 4,
            "issue_type": "high_co", "source": "manual",
            "observation": "Carbon monoxide smell reported near haulage route.",
            "severity": "CRITICAL",
        },
    ]
    for issue in site_issues:
        await SiteIssue(**issue).insert()
    print(f"Seeded {len(site_issues)} SiteIssue rows")

    person_issue = PersonIssue(
        worker_id=worker.id if worker else None,
        mine_id=ecl.id, level="A", section=3,
        issue_type="no_helmet", source="manual",
        observation="Worker observed without safety helmet near the coal face.",
        severity="high",
    )
    await person_issue.insert()
    print("Seeded 1 PersonIssue row")


async def _standalone() -> None:
    from scripts.db import connect

    client = await connect()
    await seed_issues()
    client.close()


if __name__ == "__main__":
    asyncio.run(_standalone())
