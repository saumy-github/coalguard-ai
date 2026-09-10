"""
Seed a handful of real, password-set test users — one per user type.

Idempotent — safe to re-run, skips anything that already exists.

Exposes `seed_users()` for `scripts/index.py` to call, and can also run standalone:
    docker compose exec backend python -m scripts.seed_users
"""

from __future__ import annotations

import asyncio

from src.auth.security import hash_password
from src.models.mine import Mine
from src.models.mine_level import MineLevel
from src.models.user import User, empty_profile_for_role, get_profile, set_profile
from src.services.mine_layout_service import generate_level_layout
from src.services.org_service import ensure_placeholder_mine, ensure_second_demo_mine

# Dev/test credential only — never use this in a real deployment.
TEST_PASSWORD = "test123"

DEMO_MINE_LEVELS = [
    {"level": "A", "section_count": 20},
    {"level": "B", "section_count": 15},
    {"level": "C", "section_count": 10},
]

# `mine: "secondary"` puts that seed user on the second demo mine (BCCL)
# instead of the default primary one (ECL).
SEED_USERS = [
    {"role": "worker", "phone": "9990000001", "full_name": "Test Worker"},
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
    existing_levels = {
        lvl.level: lvl
        for lvl in await MineLevel.find(MineLevel.mine_id == mine.id).to_list()
    }
    for level in DEMO_MINE_LEVELS:
        lvl_name = level["level"]
        existing = existing_levels.get(lvl_name)
        if existing is None:
            layout = generate_level_layout(lvl_name, level["section_count"])
            await MineLevel(mine_id=mine.id, **level, **layout).insert()
            print(f"  [new]    MineLevel {lvl_name} for {mine.name}")
        elif not existing.sections or not existing.view_box or not existing.boundary:
            layout = generate_level_layout(lvl_name, level["section_count"])
            existing.boundary = layout["boundary"]
            existing.view_box = layout["view_box"]
            existing.sections = layout["sections"]
            await existing.save()
            print(f"  [update] MineLevel {lvl_name} layout updated for {mine.name}")


async def seed_users() -> None:
    # Clean up corrupted users with neither email nor phone
    await User.find({"email": None, "phone": None}).delete()

    primary_mine = await ensure_placeholder_mine()
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

        expected_profile = empty_profile_for_role(seed["role"])
        if seed["role"] in ("worker", "safety_officer"):
            expected_profile.mine = mine.id
        elif seed["role"] == "corporate_manager":
            expected_profile.mines = [mine.id]
        elif seed["role"] == "regulator":
            expected_profile.mines = [primary_mine.id, secondary_mine.id]

        existing = await User.find_one({"$or": conditions}) if conditions else None
        if existing:
            current_profile = get_profile(existing)
            needs_update = False
            if seed["role"] in ("worker", "safety_officer"):
                if getattr(current_profile, "mine", None) != mine.id:
                    current_profile.mine = mine.id
                    needs_update = True
            elif seed["role"] == "corporate_manager":
                if mine.id not in (getattr(current_profile, "mines", None) or []):
                    current_profile.mines = [mine.id]
                    needs_update = True
            elif seed["role"] == "regulator":
                if set(getattr(current_profile, "mines", None) or []) != {primary_mine.id, secondary_mine.id}:
                    current_profile.mines = [primary_mine.id, secondary_mine.id]
                    needs_update = True
            if existing.profile is None or needs_update:
                set_profile(existing, current_profile)
                await existing.save()
                print(f"  [update] {seed['role']:<22} {identifier} (profile/mine synced)")
            else:
                print(f"  [skip]   {seed['role']:<22} {identifier} (already exists)")
            continue

        user = User(
            email=seed.get("email"),
            phone=seed.get("phone"),
            password_hash=hash_password(TEST_PASSWORD),
            role=seed["role"],
            full_name=seed.get("full_name"),
            active=True,
        )
        set_profile(user, expected_profile)
        await user.insert()
        print(f"  [new]    {seed['role']:<22} {identifier}")

    print(f"\nPassword for all seeded users: {TEST_PASSWORD}\n")


async def _standalone() -> None:
    from scripts.db import connect

    client = await connect()
    await seed_users()
    client.close()


if __name__ == "__main__":
    asyncio.run(_standalone())
