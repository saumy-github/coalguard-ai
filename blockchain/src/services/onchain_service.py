"""
Reads that touch ONLY the chain — never this service's own Mongo. Reading
from the ledger's own database here would be circular for a tool whose entire
purpose is proving the database cannot be trusted alone.

get_mine_records_onchain is the killer demo: it reconstructs a mine's full
record list from eth_getLogs alone, using nothing but the deployed contract's
address and its deployedAtBlock. Delete the Mongo record AND wipe this
service's own `coalguard_ledger` database, and this endpoint still returns
every record that was ever anchored for that mine.
"""

import asyncio

from ..chain import ChainUnavailable
from ..chain.client import get_contract, get_provider, is_configured
from ..chain.deployment import resolve_deployed_at_block


async def get_record_onchain(*, record_type: str, record_id: str) -> dict:
    if not is_configured():
        raise ChainUnavailable("chain access is not configured on this service")

    contract = get_contract()
    anchors = await asyncio.to_thread(
        contract.functions.getAnchors(record_type, record_id).call
    )
    return {
        "record_type": record_type,
        "record_id": record_id,
        "anchor_count": len(anchors),
        "anchors": [
            {
                "version": a[3],
                "payload_hash": "0x" + a[0].hex(),
                "anchored_at": a[1],
                "anchored_by": a[2],
            }
            for a in anchors
        ],
    }


async def get_mine_records_onchain(*, mine_id: str, offset: int = 0, limit: int = 100) -> dict:
    """Two-step read: getRecordKeysByMine gives the set of recordKeys (cheap,
    paginated state read), then eth_getLogs over the deployment's block range
    resolves each key back to its plaintext (recordType, recordId) — storage
    never kept those strings, only the events did.
    """
    if not is_configured():
        raise ChainUnavailable("chain access is not configured on this service")

    contract = get_contract()
    w3 = get_provider()
    from_block = resolve_deployed_at_block()

    keys = await asyncio.to_thread(
        contract.functions.getRecordKeysByMine(mine_id, offset, limit).call
    )
    total = await asyncio.to_thread(contract.functions.mineRecordCount(mine_id).call)

    if not keys:
        return {"mine_id": mine_id, "total": total, "records": []}

    mine_key = await asyncio.to_thread(contract.functions.mineKeyOf(mine_id).call)
    event_filter = contract.events.RecordAnchored.create_filter(
        fromBlock=from_block,
        argument_filters={"mineKey": mine_key},
    )
    logs = await asyncio.to_thread(event_filter.get_all_entries)

    # One event per anchor, so a record with several anchors appears several
    # times; collapse to the latest (highest version) seen per recordKey.
    latest_by_key: dict[bytes, dict] = {}
    for log in logs:
        args = log["args"]
        existing = latest_by_key.get(args["recordKey"])
        if existing is None or args["version"] > existing["version"]:
            latest_by_key[args["recordKey"]] = {
                "record_type": args["recordType"],
                "record_id": args["recordId"],
                "version": args["version"],
                "payload_hash": "0x" + args["payloadHash"].hex(),
                "anchored_at": args["anchoredAt"],
            }

    wanted = set(keys)
    records = [v for k, v in latest_by_key.items() if k in wanted]

    return {"mine_id": mine_id, "total": total, "records": records}
