"""
The service's hot wallet and its in-memory nonce counter.

Nonce is read from the chain exactly once, at first use, then incremented in
process memory for every subsequent send. Re-querying eth_getTransactionCount
per transaction against a public RPC is the textbook way to get a stale value
back (the RPC node hasn't seen your own just-broadcast tx yet) and produce
"nonce too low" / duplicate-nonce errors. This service sends serially by
design (see worker.py), so an in-memory counter can never drift from reality
as long as this process is the only writer — which it is, since ANCHORER_ROLE
is held by exactly one address.
"""

import asyncio
from functools import lru_cache

from eth_account import Account
from eth_account.signers.local import LocalAccount

from . import ChainUnavailable
from .client import get_provider
from ..config import settings

_nonce_lock = asyncio.Lock()
_next_nonce: int | None = None


@lru_cache(maxsize=1)
def get_account() -> LocalAccount:
    if not settings.anchor_private_key:
        raise ChainUnavailable("ANCHOR_PRIVATE_KEY is not set")
    return Account.from_key(settings.anchor_private_key.get_secret_value())


async def get_balance_wei() -> int:
    account = get_account()
    w3 = get_provider()
    return await asyncio.to_thread(w3.eth.get_balance, account.address)


async def reserve_nonce() -> int:
    """Hand out the next nonce to use and advance the counter. Must be called
    exactly once per transaction actually sent, and only from the worker's
    single-flight loop — never from a request handler.
    """
    global _next_nonce
    account = get_account()
    w3 = get_provider()

    async with _nonce_lock:
        if _next_nonce is None:
            # "pending" (not "latest") so an in-flight tx from a previous
            # process life is accounted for.
            _next_nonce = await asyncio.to_thread(
                w3.eth.get_transaction_count, account.address, "pending"
            )
        nonce = _next_nonce
        _next_nonce += 1
        return nonce


def reset_nonce() -> None:
    """Forces the next reserve_nonce() call to re-read from the chain. Called
    after a NONCE_TOO_LOW / REPLACEMENT_UNDERPRICED error, which means our
    in-memory counter has drifted from what the chain actually has.
    """
    global _next_nonce
    _next_nonce = None
