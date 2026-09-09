"""
The actual anti-tampering check: re-hash a payload and ask the CHAIN — never
this service's own database — whether that hash was ever anchored, and at
which version.

Five verdicts, deliberately never collapsed into three. A tool that reports
TAMPERED because an RPC call timed out is worse than useless — it turns an
infrastructure hiccup into a false accusation against whoever operates the
record. UNAVAILABLE exists specifically so that can never happen.
"""

import asyncio
from typing import Literal

from ..canonical import payload_hash
from ..chain import ChainUnavailable
from ..chain.client import get_contract, is_configured

Verdict = Literal["VERIFIED", "STALE", "TAMPERED", "NOT_ANCHORED", "UNAVAILABLE"]


async def verify_record(
    *,
    record_type: str,
    record_id: str,
    mine_id: str,
    payload_version: int,
    payload: dict,
) -> dict:
    current_hash = payload_hash(
        record_type=record_type,
        record_id=record_id,
        mine_id=mine_id,
        payload_version=payload_version,
        payload=payload,
    )

    if not is_configured():
        return {
            "verdict": "UNAVAILABLE",
            "payload_hash": current_hash,
            "reason": "chain access is not configured on this service (ANCHOR_ENABLED=false, "
            "or CHAIN_RPC_URL/CONTRACT_ADDRESS unset)",
        }

    try:
        contract = get_contract()
        # bytes, not the 0x-string: web3.py 6 type-checks bytes32 arguments
        # strictly and rejects a hex string outright. Passing the string would
        # raise, get caught below, and report UNAVAILABLE forever — a verify
        # that never works but never looks broken.
        found, version, anchored_at, anchor_count = await asyncio.to_thread(
            contract.functions.verify(
                record_type, record_id, bytes.fromhex(current_hash[2:])
            ).call
        )
    except ChainUnavailable as exc:
        return {"verdict": "UNAVAILABLE", "payload_hash": current_hash, "reason": str(exc)}
    except Exception as exc:  # RPC timeout, connection refused, etc.
        return {
            "verdict": "UNAVAILABLE",
            "payload_hash": current_hash,
            "reason": f"chain read failed: {exc}",
        }

    if anchor_count == 0:
        # Absence is not proof of tampering — the record may simply predate
        # the ledger, or never needed anchoring in the first place.
        return {
            "verdict": "NOT_ANCHORED",
            "payload_hash": current_hash,
            "anchor_count": 0,
        }

    if not found:
        return {
            "verdict": "TAMPERED",
            "payload_hash": current_hash,
            "anchor_count": anchor_count,
        }

    is_latest = version == anchor_count - 1
    return {
        "verdict": "VERIFIED" if is_latest else "STALE",
        "payload_hash": current_hash,
        "version": version,
        "anchor_count": anchor_count,
        "anchored_at": anchored_at,
        "is_latest": is_latest,
    }
