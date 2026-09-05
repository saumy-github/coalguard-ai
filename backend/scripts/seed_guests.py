"""
Seed the guest demo accounts — one per user type, no password.

Distinct from `seed_users.py`'s real password-set test accounts: these back
"Continue as Guest" (`POST /auth/guest`, `src/auth/guest.py`) on the frontend
Landing page. `login_as_guest` looks one of these up by `role` and fails
with "No guest account exists" if it isn't there yet — this script is what
makes that account exist. Idempotent (`ensure_guest_users_seeded` itself
skips anything already present).

Exposes `seed_guests()` for `scripts/index.py` to call, and can also run
standalone:
    docker compose exec backend python -m scripts.seed_guests
"""

from __future__ import annotations

import asyncio

from src.auth.guest import ensure_guest_users_seeded


async def seed_guests() -> None:
    print("\nSeeding guest demo accounts (one per user type, no password)...\n")
    await ensure_guest_users_seeded()
    print("  Guest accounts ready — Landing page \"Continue as Guest\" cards will work now.\n")


async def _standalone() -> None:
    from scripts.db import connect

    client = await connect()
    await seed_guests()
    client.close()


if __name__ == "__main__":
    asyncio.run(_standalone())
