"""
/health — matches ai_engine's {"status", "modules": {name: {"ready", ...}}}
shape exactly, so both microservices' health output looks the same to
whoever's reading it.

Always returns 200, even when degraded: a compose healthcheck flapping mid-
demo helps nobody, and "degraded" is meaningful application state, not a
transport failure. The payload carries the truth.
"""

import asyncio

from web3 import Web3

from . import worker
from .chain import ChainUnavailable
from .chain.client import get_contract, get_provider, is_configured
from .chain.signer import get_account, get_balance_wei
from .config import settings
from .models.ledger_entry import LedgerEntry


async def check() -> dict:
    modules: dict = {}

    modules["mongo"] = await _check_mongo()
    modules["rpc"] = await _check_rpc()
    modules["contract"] = await _check_contract()
    modules["signer"] = await _check_signer()
    modules["worker"] = await _check_worker()

    overall = "ok" if all(m.get("ready") for m in modules.values()) else "degraded"
    return {"status": overall, "anchor_enabled": settings.anchor_enabled, "modules": modules}


async def _check_mongo() -> dict:
    try:
        await LedgerEntry.find().limit(1).to_list()
        return {"ready": True}
    except Exception as exc:
        return {"ready": False, "error": str(exc)}


async def _check_rpc() -> dict:
    if not settings.anchor_enabled:
        return {"ready": False, "reason": "anchor_enabled=false"}
    if not settings.chain_rpc_url:
        return {"ready": False, "reason": "CHAIN_RPC_URL not set"}
    try:
        w3 = get_provider()
        block_number = await asyncio.to_thread(lambda: w3.eth.block_number)
        actual_chain_id = await asyncio.to_thread(lambda: w3.eth.chain_id)
        # Catches "deployed to Sepolia but .env still points at the local
        # Hardhat address" — a config mismatch that otherwise presents as
        # every single call reverting for no obvious reason.
        chain_id_matches = actual_chain_id == settings.chain_id
        return {
            "ready": chain_id_matches,
            "block_number": block_number,
            "chain_id": actual_chain_id,
            "expected_chain_id": settings.chain_id,
            **({} if chain_id_matches else {"error": "chain_id mismatch"}),
        }
    except Exception as exc:
        return {"ready": False, "error": str(exc)}


async def _check_contract() -> dict:
    if not is_configured():
        return {"ready": False, "reason": "not configured"}
    try:
        contract = get_contract()
        code_len = await asyncio.to_thread(
            lambda: len(get_provider().eth.get_code(contract.address))
        )
        return {"ready": code_len > 0, "address": contract.address}
    except ChainUnavailable as exc:
        return {"ready": False, "error": str(exc)}
    except Exception as exc:
        return {"ready": False, "error": str(exc)}


async def _check_signer() -> dict:
    if not settings.anchor_enabled or not settings.anchor_private_key:
        return {"ready": False, "reason": "no signer configured"}
    try:
        account = get_account()
        balance_wei = await get_balance_wei()
        balance_eth = Web3.from_wei(balance_wei, "ether")
        has_role = False
        if is_configured():
            try:
                contract = get_contract()
                role = await asyncio.to_thread(contract.functions.ANCHORER_ROLE().call)
                has_role = await asyncio.to_thread(
                    contract.functions.hasRole(role, account.address).call
                )
            except Exception:
                pass
        funded = balance_wei >= settings.balance_warning_wei
        return {
            "ready": funded and has_role,
            "address": account.address,
            "balance_eth": str(balance_eth),
            "funded": funded,
            # The single most valuable check in this module: catches "we
            # redeployed and forgot to grant the role", which otherwise
            # presents as every anchor transaction reverting with no
            # visible cause.
            "has_anchorer_role": has_role,
        }
    except ChainUnavailable as exc:
        return {"ready": False, "error": str(exc)}
    except Exception as exc:
        return {"ready": False, "error": str(exc)}


async def _check_worker() -> dict:
    snapshot = worker.status_snapshot()
    return {
        "ready": snapshot["running"] and snapshot["last_error"] is None,
        "last_tick_at": snapshot["last_tick_at"].isoformat() if snapshot["last_tick_at"] else None,
        "last_error": snapshot["last_error"],
    }
