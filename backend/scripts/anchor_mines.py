"""
Anchor every existing Mine to the blockchain ledger — the demo script for the
whole anchoring feature (see IMPLEMENTATION_PLAN_NEW.md / BLOCKCHAIN_PLAN.md
step 1 of "Verification"): run this, then poll the ledger service until every
entry reaches `confirmed`, each with a clickable sepolia.etherscan.io tx.

Deliberately NOT wired into scripts/index.py — that's the seed orchestrator,
and a network call there would make `npm run dev:seed` fail every time the
chain (or even just the blockchain service) happens to be down. This script
is a standalone, opt-in trigger.

Run:
    docker compose exec backend python -m scripts.anchor_mines
"""

from __future__ import annotations

import asyncio

from scripts.db import connect
from src.models.mine import Mine
from src.services.audit_service import anchor_record


async def anchor_mines() -> None:
    mines = await Mine.find_all().to_list()
    if not mines:
        print("[skip] No mines to anchor")
        return

    for mine in mines:
        result = await anchor_record(record_type="mine", record_id=str(mine.id))
        status = result.get("status", "?")
        if status == "unavailable":
            print(f"  ⚠️  {mine.name}: unavailable ({result.get('reason')})")
        else:
            existing = " (already queued)" if result.get("existing") else ""
            print(f"  ⛓️  {mine.name}: {status}{existing} — {result.get('payload_hash')}")

    print(f"\n✨ Triggered anchoring for {len(mines)} mine(s).")
    print("   Poll GET /api/ledger/entries?status=pending on the blockchain")
    print("   service (127.0.0.1:8003) to watch pending → submitted → confirmed.")


if __name__ == "__main__":

    async def main() -> None:
        client = await connect()
        try:
            await anchor_mines()
        finally:
            client.close()

    try:
        asyncio.run(main())
    except Exception as exc:
        print(f"\n❌ Anchoring failed: {exc}")
        raise SystemExit(1)
