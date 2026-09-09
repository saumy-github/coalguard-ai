"""
LedgerEntry — the outbox. This collection IS the anchor queue.

Deliberately not an in-process asyncio.Queue: that would make the whole
feature self-refuting, since a service restart would silently drop every
record queued but not yet confirmed — precisely the "record disappeared with
no trace" failure this system exists to make impossible. Every entry the
worker has not yet finished with survives a restart because it lives here,
not in memory.

Four statuses, not three, and the reason is concrete: `pending -> submitted ->
confirmed | failed` lets the worker distinguish "never sent" from "sent, in
the mempool, awaiting a receipt". With only pending/confirmed/failed, a
restart mid-flight can't tell those two apart and would re-send an
already-broadcast transaction, producing a duplicate on-chain anchor attempt
(caught by AlreadyAnchored on the happy path, but a real double-send hazard
on a re-org or dropped-then-mined mempool tx).
"""

from datetime import datetime, timezone
from typing import Literal, Optional

from beanie import Document
from pydantic import Field
from pymongo import ASCENDING, DESCENDING, IndexModel

LedgerEntryStatus = Literal["pending", "submitted", "confirmed", "failed"]


class LedgerEntry(Document):
    record_type: str
    record_id: str
    mine_id: str

    payload_version: int
    payload_hash: str  # 0x-prefixed 32-byte hex, from src.canonical.payload_hash

    # None until a receipt confirms it — the contract, not this service,
    # assigns the version. Never guess it client-side.
    version: Optional[int] = None

    status: LedgerEntryStatus = "pending"

    tx_hash: Optional[str] = None
    nonce: Optional[int] = None
    block_number: Optional[int] = None
    gas_used: Optional[int] = None

    chain_id: Optional[int] = None
    contract_address: Optional[str] = None

    # Incremented only on a REAL send attempt. A pending entry stuck because
    # the wallet is out of test ETH does NOT increment this — see
    # src/worker.py — so a temporary faucet problem never exhausts the retry
    # budget of something that was otherwise fine.
    attempts: int = 0
    last_error: Optional[str] = None

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    submitted_at: Optional[datetime] = None
    confirmed_at: Optional[datetime] = None

    class Settings:
        name = "ledger_entries"
        indexes = [
            # The worker's claim query: "oldest pending/submitted entries first".
            IndexModel([("status", ASCENDING), ("created_at", ASCENDING)]),
            # Idempotency at the DB layer, matching the contract's own
            # idempotency: two entries for the same (record, version) once
            # version is a real int is a bug, not a legitimate re-anchor.
            # partialFilterExpression scopes this to confirmed entries only —
            # multiple pending/submitted rows for the same record (a status
            # cycling open->in_progress->open, each queued separately) must
            # NOT collide while version is still None.
            #
            # contract_address is part of the key because `version` is a
            # per-contract counter that restarts at 0 on every deployment.
            # Without it, re-anchoring a record after a redeploy collides with
            # that record's version 0 on the OLD contract, and the entry can
            # never be marked confirmed — it sits in `submitted` forever while
            # the anchor sits happily on chain.
            IndexModel(
                [
                    ("record_type", ASCENDING),
                    ("record_id", ASCENDING),
                    ("contract_address", ASCENDING),
                    ("version", ASCENDING),
                ],
                unique=True,
                partialFilterExpression={"version": {"$type": "int"}},
            ),
            # Mine-scoped history, newest first — the /records and /mines
            # read paths.
            IndexModel([("mine_id", ASCENDING), ("created_at", DESCENDING)]),
            # Reconciliation: "does a receipt exist for this tx yet". Sparse
            # because most entries have no tx_hash until submitted.
            IndexModel([("tx_hash", ASCENDING)], sparse=True),
        ]
