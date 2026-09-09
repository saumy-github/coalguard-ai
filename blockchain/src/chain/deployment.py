"""
Resolves the contract address and its deployedAtBlock.

CONTRACT_ADDRESS in the environment always wins when set. Otherwise this
reads the COMMITTED deployments/<network>.json that `npm run chain:deploy:*`
writes — the network name is derived from CHAIN_ID, matching
blockchain/hardhat.config.js's own network table (sepolia=11155111,
localhost=31337), so a fresh clone gets a working contract address with zero
manual configuration.
"""

import json
from functools import lru_cache
from pathlib import Path
from typing import Optional

from . import ChainUnavailable
from ..config import settings

_DEPLOYMENTS_DIR = Path(__file__).resolve().parent.parent.parent / "deployments"

_NETWORK_BY_CHAIN_ID = {11155111: "sepolia", 31337: "localhost"}


@lru_cache(maxsize=1)
def _read_deployment_file() -> Optional[dict]:
    network = _NETWORK_BY_CHAIN_ID.get(settings.chain_id)
    if network is None:
        return None
    path = _DEPLOYMENTS_DIR / f"{network}.json"
    if not path.exists():
        return None
    with open(path) as f:
        return json.load(f)


def resolve_contract_address() -> str:
    if settings.contract_address:
        return settings.contract_address
    record = _read_deployment_file()
    if record is None:
        raise ChainUnavailable(
            "No CONTRACT_ADDRESS set and no deployments/<network>.json found for "
            f"chain_id={settings.chain_id}. Deploy first: npm run chain:deploy:sepolia"
        )
    return record["address"]


def resolve_deployed_at_block() -> int:
    if settings.deployed_at_block is not None:
        return settings.deployed_at_block
    record = _read_deployment_file()
    if record is None or "deployedAtBlock" not in record:
        raise ChainUnavailable(
            "deployedAtBlock is unknown — set DEPLOYED_AT_BLOCK explicitly or ensure "
            f"deployments/{_NETWORK_BY_CHAIN_ID.get(settings.chain_id, '<network>')}.json exists"
        )
    return record["deployedAtBlock"]
