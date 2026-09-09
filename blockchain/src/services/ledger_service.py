"""
The outbox itself: enqueue, list, and read back LedgerEntry rows. Nothing
here touches the chain — that's src/worker.py (writes) and
src/services/onchain_service.py / verify_service.py (reads).
"""

from datetime import datetime, timezone
from typing import Optional

from ..canonical import payload_hash
from ..chain import ChainUnavailable
from ..chain.deployment import resolve_contract_address
from ..config import settings
from ..models.ledger_entry import LedgerEntry, LedgerEntryStatus


def _current_contract_address() -> Optional[str]:
    # Resolves CONTRACT_ADDRESS, falling back to deployments/<network>.json —
    # the same resolution the worker and verify use, so an entry's recorded
    # address always means the address it would actually be anchored to.
    try:
        return resolve_contract_address()
    except ChainUnavailable:
        # Enqueueing must work with no chain configured at all (the
        # ANCHOR_ENABLED=false path); the worker resolves it again later.
        return None


def _same_address(a: Optional[str], b: Optional[str]) -> bool:
    # EVM addresses are case-insensitive; EIP-55 checksumming means the same
    # address can be stored with different capitalisation depending on whether
    # it came from an env var or from web3's checksumming.
    if a is None or b is None:
        return a == b
    return a.lower() == b.lower()


async def enqueue_anchor(
    *,
    record_type: str,
    record_id: str,
    mine_id: str,
    payload_version: int,
    payload: dict,
) -> tuple[LedgerEntry, bool]:
    """Compute the hash and create a pending entry.

    Returns (entry, existing). existing=True means we found a non-terminal
    entry already carrying this exact hash and returned it as-is rather than
    creating a duplicate — the common case of a caller re-anchoring an
    unchanged record. A `failed` entry with the same hash is NOT treated as
    existing: it gets a fresh row, because whatever made it fail (e.g. a role
    that was later granted) deserves its own attempt, not silent reuse of a
    dead one.

    Reuse is also scoped to the CURRENT contract and chain. An entry confirmed
    against a contract we no longer point at proves nothing about the one we
    do — after a redeploy, its `confirmed` status is a statement about an
    address that is now irrelevant. Without this scoping the service would
    refuse to re-anchor anything post-redeploy, and every record would read
    NOT_ANCHORED forever while the queue insisted it was confirmed: the
    ledger's own database contradicting the chain, which is the one thing
    this service must never do.
    """
    hash_ = payload_hash(
        record_type=record_type,
        record_id=record_id,
        mine_id=mine_id,
        payload_version=payload_version,
        payload=payload,
    )

    latest = (
        await LedgerEntry.find(
            LedgerEntry.record_type == record_type,
            LedgerEntry.record_id == record_id,
        )
        .sort(-LedgerEntry.created_at)
        .first_or_none()
    )

    current_address = _current_contract_address()

    if (
        latest
        and latest.payload_hash == hash_
        and latest.status in ("pending", "submitted", "confirmed")
        and latest.chain_id == settings.chain_id
        and _same_address(latest.contract_address, current_address)
    ):
        return latest, True

    entry = LedgerEntry(
        record_type=record_type,
        record_id=record_id,
        mine_id=mine_id,
        payload_version=payload_version,
        payload_hash=hash_,
        chain_id=settings.chain_id,
        contract_address=current_address,
    )
    await entry.insert()
    return entry, False


async def enqueue_anchor_batch(
    items: list[dict],
) -> list[tuple[LedgerEntry, bool]]:
    return [await enqueue_anchor(**item) for item in items]


async def get_entry(entry_id: str) -> Optional[LedgerEntry]:
    return await LedgerEntry.get(entry_id)


async def list_entries(
    *, status: Optional[LedgerEntryStatus] = None, limit: int = 50
) -> list[LedgerEntry]:
    query = LedgerEntry.find({"status": status} if status else {})
    return await query.sort(-LedgerEntry.created_at).limit(limit).to_list()


async def get_record_history(*, record_type: str, record_id: str) -> list[LedgerEntry]:
    """The service's own view of a record's anchors, oldest first. This is a
    cache, never the trust anchor — see onchain_service for the source of
    truth read directly from the chain.
    """
    return (
        await LedgerEntry.find(
            LedgerEntry.record_type == record_type,
            LedgerEntry.record_id == record_id,
        )
        .sort(+LedgerEntry.created_at)
        .to_list()
    )


async def retry_entry(entry_id: str) -> Optional[LedgerEntry]:
    """Requeue a terminal `failed` entry. No-op (returns None) for anything
    else — retrying a pending/submitted entry would race the worker, and a
    confirmed entry has nothing to retry.
    """
    entry = await LedgerEntry.get(entry_id)
    if entry is None or entry.status != "failed":
        return None
    entry.status = "pending"
    entry.last_error = None
    await entry.save()
    return entry


async def stats() -> dict:
    counts: dict[str, int] = {}
    for status in ("pending", "submitted", "confirmed", "failed"):
        counts[status] = await LedgerEntry.find(LedgerEntry.status == status).count()
    return {"queue": counts, "total": sum(counts.values())}
