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
from src.models.mine import Mine, Subsidiary
from src.models.user import User

# Dev/test credential only — never use this in a real deployment.
TEST_PASSWORD = "test123"

SEED_USERS = [
    {"user_type": "worker", "phone": "+919990000001", "full_name": "Test Worker", "role_title": "Worker"},
    {"user_type": "mine_safety_officer", "email": "officer@example.com", "full_name": "Test Mine Safety Officer"},
    {"user_type": "corporate_management", "email": "corporate@example.com", "full_name": "Test Corporate Manager"},
    {"user_type": "regulatory_authority", "email": "regulator@example.com", "full_name": "Test Regulatory Auditor"},
    {"user_type": "admin", "email": "admin@example.com", "full_name": "Test Admin"},
]


async def ensure_placeholder_org() -> tuple[Subsidiary, Mine]:
    """Mine/Subsidiary CRUD (research/lld.md §7b) doesn't exist yet — create one
    placeholder pair if none exist, just enough for seeded users to reference.
    """
    subsidiary = await Subsidiary.find_one()
    if subsidiary is None:
        subsidiary = await Subsidiary(name="Test Subsidiary", code="TEST").insert()
        print(f"Created placeholder Subsidiary: {subsidiary.name} ({subsidiary.id})")

    mine = await Mine.find_one(Mine.subsidiary_id == subsidiary.id)
    if mine is None:
        mine = await Mine(subsidiary_id=subsidiary.id, name="Test Mine").insert()
        print(f"Created placeholder Mine: {mine.name} ({mine.id})")

    return subsidiary, mine


async def seed_users() -> None:
    subsidiary, mine = await ensure_placeholder_org()

    print("\nSeeded test users (password for all of them below):\n")
    for seed in SEED_USERS:
        identifier = seed.get("email") or seed.get("phone")

        # Only match on fields this seed entry actually has — including a bare
        # {"field": None} in $or would match ANY document missing that field
        # entirely, which is never what we want here.
        conditions = []
        if seed.get("email"):
            conditions.append({"email": seed["email"]})
        if seed.get("phone"):
            conditions.append({"phone": seed["phone"]})

        existing = await User.find_one({"$or": conditions}) if conditions else None
        if existing:
            print(f"  [skip] {seed['user_type']:<22} {identifier} (already exists)")
            continue

        is_worker = seed["user_type"] == "worker"
        await User(
            email=seed.get("email"),
            phone=seed.get("phone"),
            password_hash=hash_password(TEST_PASSWORD),
            user_type=seed["user_type"],
            mine_id=mine.id if is_worker else None,
            subsidiary_id=subsidiary.id if not is_worker else None,
            full_name=seed.get("full_name"),
            role_title=seed.get("role_title"),
            is_guest=False,
            has_login=True,
            active=True,
        ).insert()
        print(f"  [new]  {seed['user_type']:<22} {identifier}")

    print(f"\nPassword for all seeded users: {TEST_PASSWORD}\n")


async def _standalone() -> None:
    from scripts.db import connect

    client = await connect()
    await seed_users()
    client.close()


if __name__ == "__main__":
    asyncio.run(_standalone())
