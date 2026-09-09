"""
Provider + contract construction. Pure object setup — no network I/O happens
just by calling get_provider()/get_contract(), so these are safe to call from
async code directly. The actual RPC calls made through the returned objects
are synchronous (web3.py 6.x) and must be wrapped in asyncio.to_thread at the
call site — see src/worker.py and src/services/onchain_service.py.
"""

import json
from functools import lru_cache
from pathlib import Path

from web3 import Web3
from web3.contract import Contract

from . import ChainUnavailable
from .deployment import resolve_contract_address
from ..config import settings

_ABI_PATH = Path(__file__).resolve().parent.parent.parent / "abi" / "AuditLedger.json"


def is_configured() -> bool:
    """True only when every piece needed to talk to the chain is present.
    ANCHOR_ENABLED=false short-circuits this even if the rest is filled in —
    that flag is the operator's explicit "don't touch the chain" switch.
    """
    if not (settings.anchor_enabled and settings.chain_rpc_url):
        return False
    try:
        resolve_contract_address()
    except ChainUnavailable:
        return False
    return True


@lru_cache(maxsize=1)
def _load_abi() -> list:
    if not _ABI_PATH.exists():
        raise ChainUnavailable(
            f"{_ABI_PATH} is missing — run `npm run chain:export-abi` "
            "(committed to the repo; a fresh clone should already have it)"
        )
    with open(_ABI_PATH) as f:
        return json.load(f)["abi"]


@lru_cache(maxsize=1)
def get_provider() -> Web3:
    if not settings.chain_rpc_url:
        raise ChainUnavailable("CHAIN_RPC_URL is not set")
    return Web3(Web3.HTTPProvider(settings.chain_rpc_url, request_kwargs={"timeout": 15}))


@lru_cache(maxsize=1)
def get_contract() -> Contract:
    w3 = get_provider()
    address = Web3.to_checksum_address(resolve_contract_address())
    return w3.eth.contract(address=address, abi=_load_abi())


def assert_contract_deployed() -> None:
    """Fails loudly and specifically rather than letting every subsequent call
    revert mysteriously. Catches the classic "pointed CONTRACT_ADDRESS at the
    wrong network" mistake — a Sepolia address with CHAIN_ID still set to the
    local Hardhat chain, or vice versa.
    """
    w3 = get_provider()
    actual_chain_id = w3.eth.chain_id
    if actual_chain_id != settings.chain_id:
        raise ChainUnavailable(
            f"RPC reports chain_id={actual_chain_id}, but CHAIN_ID={settings.chain_id} "
            "— CONTRACT_ADDRESS almost certainly points at the wrong network"
        )
    address = resolve_contract_address()
    code = w3.eth.get_code(Web3.to_checksum_address(address))
    if len(code) == 0:
        raise ChainUnavailable(f"No contract code at {address} on chain {actual_chain_id}")
