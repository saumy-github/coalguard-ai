"""
EIP-1559 fee calculation. Sepolia is EIP-1559 — legacy gasPrice transactions
still work but pay whatever the network wants with no cap, which is exactly
the failure mode a hackathon wallet with a one-time faucet claim cannot
afford.
"""

import asyncio

from web3 import Web3

FALLBACK_PRIORITY_FEE_WEI = Web3.to_wei(1.5, "gwei")


async def build_fees(w3: Web3) -> dict:
    """maxFeePerGas = 2 x current base fee + priority fee — the standard
    "survive a couple of base-fee-doubling blocks" headroom recommended by
    the EIP-1559 spec itself, not an arbitrary number.
    """
    try:
        priority_fee = await asyncio.to_thread(lambda: w3.eth.max_priority_fee)
    except Exception:
        priority_fee = FALLBACK_PRIORITY_FEE_WEI

    latest_block = await asyncio.to_thread(w3.eth.get_block, "latest")
    base_fee = latest_block["baseFeePerGas"]

    return {
        "maxPriorityFeePerGas": priority_fee,
        "maxFeePerGas": 2 * base_fee + priority_fee,
    }


def bump_fees(fees: dict, *, factor: float = 1.25) -> dict:
    """Used when re-sending a stuck transaction at the same nonce — a
    replacement must strictly increase both fee fields or every node rejects
    it as underpriced.
    """
    return {
        "maxPriorityFeePerGas": int(fees["maxPriorityFeePerGas"] * factor),
        "maxFeePerGas": int(fees["maxFeePerGas"] * factor),
    }
