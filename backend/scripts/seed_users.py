"""
Seed a handful of real, password-set test users — one per user type.

Distinct from guest accounts (`auth/guest.py`): these have real passwords and are
meant for the team to actually log in and test with during development, not for
demo/guest login. Idempotent — safe to re-run, skips anything that already exists.

Exposes `seed_users()` for `scripts/index.py` to call, and can also run standalone:
    docker compose exec backend python -m scripts.seed_users
"""

from __future__ import annotations

import asyncio

from src.auth.security import hash_password
from src.models.mine import Mine
from src.models.mine_level import MineLevel
from src.models.user import User
from src.services.mine_assignment_service import ensure_mine_assignment
from src.services.org_service import ensure_placeholder_org, ensure_second_demo_mine

# Dev/test credential only — never use this in a real deployment.
TEST_PASSWORD = "test123"

# research/saumy/06-maps-plan.md's confirmed demo layout, applied to every demo mine.
DEMO_MINE_LEVELS = [
    {"level": "A", "section_count": 20},
    {"level": "B", "section_count": 15},
    {"level": "C", "section_count": 10},
]

# `mine` picks which demo mine a seed user is assigned to — "primary" (ECL
# Sector 7G, the original placeholder) unless marked "secondary" (BCCL
# Moonidih, added in Phase 7 so the Regulator has more than one mine to
# aggregate across — research/saumy/09-changes-5-sep.md Decision #13's
# "Regulator scope" note).
SEED_USERS = [
    {"role": "worker", "phone": "9990000001", "full_name": "Test Worker", "role_title": "Worker"},
    {"role": "safety_officer", "email": "officer@example.com", "full_name": "Test Mine Safety Officer"},
    {"role": "corporate_manager", "email": "corporate@example.com", "full_name": "Test Corporate Manager (ECL)"},
    {
        "role": "corporate_manager",
        "email": "corporate2@example.com",
        "full_name": "Test Corporate Manager (BCCL)",
        "mine": "secondary",
    },
    {"role": "regulator", "email": "regulator@example.com", "full_name": "Test Regulatory Auditor"},
    {"role": "admin", "email": "admin@example.com", "full_name": "Test Admin"},
]


async def ensure_mine_levels_seeded(mine: Mine) -> None:
    if await MineLevel.find_one(MineLevel.mine_id == mine.id) is None:
        for level in DEMO_MINE_LEVELS:
            await MineLevel(mine_id=mine.id, **level).insert()
        print(f"Seeded {len(DEMO_MINE_LEVELS)} MineLevel rows for {mine.name}")


async def seed_users() -> None:
    subsidiary, primary_mine = await ensure_placeholder_org()
    secondary_mine = await ensure_second_demo_mine()
    await ensure_mine_levels_seeded(primary_mine)
    await ensure_mine_levels_seeded(secondary_mine)

    print("\nSeeded test users (password for all of them below):\n")
    for seed in SEED_USERS:
        identifier = seed.get("email") or seed.get("phone")
        mine = secondary_mine if seed.get("mine") == "secondary" else primary_mine

        # Only match on fields this seed entry actually has — including a bare
        # {"field": None} in $or would match ANY document missing that field
        # entirely, which is never what we want here.
        conditions = []
        if seed.get("email"):
            conditions.append({"email": seed["email"]})
        if seed.get("phone"):
            conditions.append({"phone": seed["phone"]})

        # Scope per Decision #12/#11: Worker, Safety Officer, and Corporate
        # Management are all mine-scoped via a real MineAssignment (Decision
        # #11 explicitly rejects subsidiary-based scoping — the legacy
        # subsidiary_id below is unused by any route, kept only until
        # deleted). Regulator and Admin get neither: Regulator's scope is
        # derived, not assigned (Decision #13's "Regulator scope" note —
        # every mine with an active Corporate Management assignment), and
        # Admin is genuinely global.
        is_mine_scoped = seed["role"] in ("worker", "safety_officer", "corporate_manager")
        is_subsidiary_scoped = seed["role"] == "corporate_manager"

        existing = await User.find_one({"$or": conditions}) if conditions else None
        if existing:
            print(f"  [skip] {seed['role']:<22} {identifier} (already exists)")
            user = existing
        else:
            user = await User(
                email=seed.get("email"),
                phone=seed.get("phone"),
                password_hash=hash_password(TEST_PASSWORD),
                role=seed["role"],
                mine_id=mine.id if is_mine_scoped else None,
                subsidiary_id=subsidiary.id if is_subsidiary_scoped else None,
                full_name=seed.get("full_name"),
                role_title=seed.get("role_title"),
                is_guest=False,
                active=True,
            ).insert()
            print(f"  [new]  {seed['role']:<22} {identifier}")

        if is_mine_scoped:
            await ensure_mine_assignment(user, mine.id)

    print(f"\nPassword for all seeded users: {TEST_PASSWORD}\n")


async def _standalone() -> None:
    from scripts.db import connect

    client = await connect()
    await seed_users()
    client.close()


if __name__ == "__main__":
    asyncio.run(_standalone())
