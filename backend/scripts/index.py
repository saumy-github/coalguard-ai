"""
Runs all seed scripts in dependency order.

Add a new collection's seed by creating scripts/seed_<collection>.py with a
seed_<collection>() function, then import and call it here.

Run:
    docker compose exec backend python -m scripts.index
"""

from __future__ import annotations

import asyncio

from scripts.db import connect
from scripts.seed_issues import seed_issues
from scripts.seed_reports import seed_reports
from scripts.seed_users import seed_users


async def main() -> None:
    client = await connect()

    print("\n🌱 Seeding users...\n")
    await seed_users()

    print("\n🌱 Seeding issues...\n")
    await seed_issues()

    print("\n🌱 Seeding reports...\n")
    await seed_reports()

    print("\n✨ Seeding complete.")
    client.close()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception as exc:
        print(f"\n❌ Seed failed: {exc}")
        raise SystemExit(1)
