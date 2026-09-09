"""
Thin connector to the blockchain ledger microservice. The backend never
hashes anything itself and never talks to Ethereum — it sends the ledger
service a record type + id, and the ledger service re-reads the record's
projected fields, hashes them, and owns the chain interaction end to end.

Invariant, stated loudly because it drives every choice below: anchoring is
best-effort and eventually consistent. Mongo is the source of truth for the
application; Sepolia is the source of truth for integrity. A chain outage
must never fail a write that triggered an anchor.

Two different failure postures, both deliberate:
- `anchor_record` SWALLOWS every failure (bad record, unreachable service,
  timeout) and returns a status dict — callers never need try/except, so a
  ticket create can never fail because the ledger happens to be down.
- `verify_record` RAISES `LedgerError` on transport failure. A verify with no
  answer must never be silently read as "no proof exists" — the route turns
  this into an explicit 502, not a false negative.
"""

import logging
from typing import Any, Callable

import httpx

from ..config import settings
from ..models.mine import Mine

logger = logging.getLogger(__name__)


class LedgerError(Exception):
    """A definite failure to anchor/verify a specific record — never raised
    for "couldn't reach the ledger service" inside anchor_record, which
    swallows that case by design."""


class RecordNotFound(LedgerError):
    """The record itself is absent or of an unknown type — a 404, not a 502.
    Kept distinct because "this mine does not exist" and "the ledger is
    unreachable" demand opposite reactions from whoever is looking: one is
    a dead end, the other is "try again in a minute"."""


def _build_mine_v1(mine: Mine) -> dict:
    # 7 decimal places is ~1cm of precision — plenty for a mine marker, and
    # fixed so the digest never depends on float formatting. Quantised to
    # strings because the ledger's canonicalizer deliberately raises on any
    # float (see blockchain/src/canonical.py) rather than risk a formatting
    # mismatch silently changing the hash.
    return {
        "name": mine.name,
        "lat": f"{mine.lat:.7f}" if mine.lat is not None else None,
        "lng": f"{mine.lng:.7f}" if mine.lng is not None else None,
    }


# Field allowlists, versioned and append-only. A payload builder projects
# exactly the fields that matter for that record type — never the whole
# document — so an unrelated future field never silently invalidates every
# existing anchor.
PAYLOAD_BUILDERS: dict[str, Callable[[Any], dict]] = {
    "mine": _build_mine_v1,
}
PAYLOAD_VERSIONS: dict[str, int] = {
    "mine": 1,
}


async def _fetch_record(*, record_type: str, record_id: str) -> Any:
    if record_type == "mine":
        record = await Mine.get(record_id)
    else:
        raise RecordNotFound(f"unknown record_type: {record_type!r}")
    if record is None:
        raise RecordNotFound(f"{record_type} {record_id!r} not found")
    return record


def _mine_id_for(*, record_type: str, record_id: str, record: Any) -> str:
    # Anchoring a mine itself: the record IS the mine, so mine_id == record_id.
    # A future record type scoped to a mine (e.g. a report) would read
    # str(record.mine_id) here instead.
    if record_type == "mine":
        return record_id
    return str(record.mine_id)


async def anchor_record(*, record_type: str, record_id: str) -> dict:
    try:
        record = await _fetch_record(record_type=record_type, record_id=record_id)
        payload = PAYLOAD_BUILDERS[record_type](record)
    except LedgerError as exc:
        logger.warning("anchor_record: %s", exc)
        return {"status": "unavailable", "reason": str(exc)}

    mine_id = _mine_id_for(record_type=record_type, record_id=record_id, record=record)
    try:
        async with httpx.AsyncClient(
            base_url=settings.blockchain_url, timeout=httpx.Timeout(5.0, connect=2.0)
        ) as client:
            response = await client.post(
                "/api/ledger/anchor",
                headers={"X-Ledger-Api-Key": settings.ledger_api_key},
                json={
                    "record_type": record_type,
                    "record_id": record_id,
                    "mine_id": mine_id,
                    "payload_version": PAYLOAD_VERSIONS[record_type],
                    "payload": payload,
                },
            )
            response.raise_for_status()
            return response.json()
    except httpx.HTTPError as exc:
        logger.warning("anchor_record: ledger service unreachable: %s", exc)
        return {"status": "unavailable", "reason": str(exc)}


async def verify_record(*, record_type: str, record_id: str) -> dict:
    record = await _fetch_record(record_type=record_type, record_id=record_id)
    payload = PAYLOAD_BUILDERS[record_type](record)
    mine_id = _mine_id_for(record_type=record_type, record_id=record_id, record=record)

    try:
        async with httpx.AsyncClient(
            base_url=settings.blockchain_url, timeout=httpx.Timeout(10.0, connect=3.0)
        ) as client:
            response = await client.post(
                "/api/ledger/verify",
                json={
                    "record_type": record_type,
                    "record_id": record_id,
                    "mine_id": mine_id,
                    "payload_version": PAYLOAD_VERSIONS[record_type],
                    "payload": payload,
                },
            )
            response.raise_for_status()
            return response.json()
    except httpx.HTTPError as exc:
        raise LedgerError(f"could not reach the ledger service: {exc}") from exc


async def get_record_history(*, record_type: str, record_id: str) -> list[dict]:
    # Deliberately does not require the Mongo record to still exist — this
    # reads the ledger service's own queue history, which is exactly what
    # lets a deleted record's anchoring history remain visible.
    try:
        async with httpx.AsyncClient(
            base_url=settings.blockchain_url, timeout=httpx.Timeout(5.0, connect=2.0)
        ) as client:
            response = await client.get(f"/api/ledger/records/{record_type}/{record_id}")
            response.raise_for_status()
            return response.json()
    except httpx.HTTPError as exc:
        raise LedgerError(f"could not reach the ledger service: {exc}") from exc
