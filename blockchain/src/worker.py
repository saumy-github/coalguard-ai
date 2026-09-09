"""
The single writer to the chain.

Two ticks, run serially in one asyncio task (see chain/signer.py's docstring
for why concurrent senders are deliberately unsupported):

  submit_tick()   pending   -> submitted   (dry-run, then sign + broadcast)
  confirm_tick()  submitted -> confirmed | failed  (poll receipts; resend only
                                                     when truly safe to)

Both ticks read their work from the LedgerEntry collection itself, never from
an in-memory queue — a restart mid-flight must be able to pick up exactly
where it left off, which is the entire reason the outbox is a Mongo
collection and not an asyncio.Queue.
"""

import asyncio
import logging
from datetime import datetime, timezone

from web3 import Web3
from web3.exceptions import ContractLogicError

from .chain import ChainUnavailable
from .chain.client import assert_contract_deployed, get_contract, get_provider, is_configured
from .chain.gas import build_fees, bump_fees
from .chain.signer import get_account, get_balance_wei, reserve_nonce, reset_nonce
from .config import settings
from .models.ledger_entry import LedgerEntry

logger = logging.getLogger("blockchain.worker")

# Populated by health.py so /health can report the last tick without the
# worker and the route handler needing to share anything more elaborate.
last_tick_at: datetime | None = None
last_tick_error: str | None = None

_running = False


def status_snapshot() -> dict:
    return {"last_tick_at": last_tick_at, "last_error": last_tick_error, "running": _running}


async def run_forever() -> None:
    global _running
    _running = True
    logger.info("worker started (anchor_enabled=%s)", settings.anchor_enabled)
    try:
        while True:
            await _tick()
            await asyncio.sleep(settings.poll_interval_seconds)
    finally:
        _running = False


async def _tick() -> None:
    global last_tick_at, last_tick_error
    last_tick_at = datetime.now(timezone.utc)

    if not settings.anchor_enabled:
        # The designed degradation: the queue accepts writes and grows, but
        # nothing is sent. /health reports this via anchor_enabled=false, not
        # as an error.
        return

    try:
        if not is_configured():
            last_tick_error = "chain not configured (CHAIN_RPC_URL / CONTRACT_ADDRESS unset)"
            return
        assert_contract_deployed()
        await _submit_tick()
        await _confirm_tick()
        last_tick_error = None
    except ChainUnavailable as exc:
        last_tick_error = str(exc)
        logger.warning("worker tick skipped: %s", exc)
    except Exception:
        last_tick_error = "unexpected error — see logs"
        logger.exception("worker tick failed")


# ── submit: pending -> submitted ─────────────────────────────────────────────


async def _submit_tick() -> None:
    pending = (
        await LedgerEntry.find(LedgerEntry.status == "pending")
        .sort(+LedgerEntry.created_at)
        .limit(settings.max_batch_size)
        .to_list()
    )
    if not pending:
        return

    account = get_account()
    balance = await get_balance_wei()
    if balance < settings.balance_warning_wei:
        # Out-of-funds is a designed degradation, not a failure: leave every
        # entry exactly as it is (still pending, attempts untouched) so a
        # faucet top-up drains the backlog with zero manual intervention.
        logger.warning(
            "signer balance low (%s wei) — leaving %d entr%s pending",
            balance, len(pending), "y" if len(pending) == 1 else "ies",
        )
        return

    contract = get_contract()

    for entry in pending:
        await _submit_one(contract, account, entry)


async def _submit_one(contract, account, entry: LedgerEntry) -> None:
    args = (entry.record_type, entry.record_id, entry.mine_id, bytes.fromhex(entry.payload_hash[2:]))

    # Free pre-flight: catches AlreadyAnchored (someone else's process already
    # anchored this exact hash — a legitimate outcome, not a failure) and a
    # revoked ANCHORER_ROLE (a real failure) before spending a single wei.
    try:
        await asyncio.to_thread(contract.functions.anchor(*args).call, {"from": account.address})
    except ContractLogicError as exc:
        await _handle_preflight_revert(contract, entry, exc)
        return
    except Exception as exc:
        entry.last_error = f"pre-flight estimate failed: {exc}"
        await entry.save()
        return

    w3 = get_provider()
    fees = await build_fees(w3)
    nonce = await reserve_nonce()

    try:
        gas_estimate = await asyncio.to_thread(
            contract.functions.anchor(*args).estimate_gas, {"from": account.address, "nonce": nonce}
        )
    except Exception:
        gas_estimate = 150_000  # the pre-flight .call above already passed; a generous static fallback

    tx = contract.functions.anchor(*args).build_transaction(
        {
            "from": account.address,
            "nonce": nonce,
            "chainId": settings.chain_id,
            "gas": int(gas_estimate * 1.25),
            **fees,
        }
    )
    signed = account.sign_transaction(tx)

    # Order matters: persist BEFORE broadcasting. A crash between these two
    # lines leaves a recoverable `submitted` row with a real tx_hash that
    # confirm_tick can poll for; a crash the other way round would leave an
    # in-flight transaction this service has no record of at all.
    entry.status = "submitted"
    # `rawTransaction`/`.hash`, not `raw_transaction`/`.tx_hash`: eth-account
    # renamed these in 0.13, and web3==6.19.0 pins eth-account 0.11. Getting
    # this wrong is invisible until the first real broadcast, which then dies
    # with AttributeError. Verified against the installed version, not guessed.
    entry.tx_hash = signed.hash.hex()
    entry.nonce = nonce
    entry.attempts += 1
    entry.submitted_at = datetime.now(timezone.utc)
    await entry.save()

    try:
        await asyncio.to_thread(w3.eth.send_raw_transaction, signed.rawTransaction)
        logger.info(
            "anchor submitted: %s/%s tx=%s nonce=%d", entry.record_type, entry.record_id, entry.tx_hash, nonce
        )
    except Exception as exc:
        # Broadcast itself failed (RPC rejected it outright). confirm_tick's
        # timeout path will notice no receipt ever arrives and re-send at the
        # same nonce once it's safe to.
        entry.last_error = f"broadcast failed: {exc}"
        await entry.save()


async def _handle_preflight_revert(contract, entry: LedgerEntry, exc: ContractLogicError) -> None:
    message = str(exc)

    if "AlreadyAnchored" in message:
        # Not a failure — some process already got this exact hash anchored.
        # Backfill from the chain's own state rather than guessing.
        try:
            anchor = await asyncio.to_thread(
                contract.functions.getLatestAnchor(entry.record_type, entry.record_id).call
            )
            entry.version = anchor[3]
            entry.confirmed_at = datetime.now(timezone.utc)
        except Exception:
            pass
        entry.status = "confirmed"
        entry.last_error = None
        await entry.save()
        logger.info(
            "anchor already present on-chain for %s/%s — marked confirmed without sending",
            entry.record_type, entry.record_id,
        )
        return

    if "AccessControlUnauthorizedAccount" in message:
        entry.status = "failed"
        entry.last_error = (
            "signer does not hold ANCHORER_ROLE — grant it: "
            "ANCHORER_ADDRESS=<signer address> npm run chain:grant-anchorer"
        )
        await entry.save()
        logger.error("anchor failed for %s/%s: %s", entry.record_type, entry.record_id, entry.last_error)
        return

    # Anything else (ZeroPayloadHash, EmptyRecordType, …) is a genuine data
    # problem in what was enqueued — terminal, will never succeed on retry
    # without the caller fixing its input.
    entry.status = "failed"
    entry.last_error = f"contract rejected: {message}"
    await entry.save()


# ── confirm: submitted -> confirmed | failed ─────────────────────────────────


async def _confirm_tick() -> None:
    submitted = await LedgerEntry.find(LedgerEntry.status == "submitted").to_list()
    if not submitted:
        return

    w3 = get_provider()
    now = datetime.now(timezone.utc)

    for entry in submitted:
        receipt = await asyncio.to_thread(_try_get_receipt, w3, entry.tx_hash)

        if receipt is None:
            await _maybe_resend_if_stuck(w3, entry, now)
            continue

        if receipt["status"] == 0:
            entry.status = "failed"
            entry.last_error = "transaction reverted on-chain"
            await entry.save()
            continue

        head = await asyncio.to_thread(lambda: w3.eth.block_number)
        if head - receipt["blockNumber"] < settings.confirmations_required:
            continue  # mined, but not yet past the confirmation threshold

        await _finalise_confirmed(entry, receipt)


def _try_get_receipt(w3: Web3, tx_hash: str):
    try:
        return w3.eth.get_transaction_receipt(tx_hash)
    except Exception:
        return None  # not mined yet — normal, not an error


async def _finalise_confirmed(entry: LedgerEntry, receipt) -> None:
    """Decode the RecordAnchored log from our own receipt and cross-check it
    against what we intended to send. A mismatch here would be a bug in this
    service, and it must be loud, never silently marked confirmed.
    """
    contract = get_contract()
    try:
        events = contract.events.RecordAnchored().process_receipt(receipt)
        match = next(
            (
                e
                for e in events
                if e["args"]["recordType"] == entry.record_type
                and e["args"]["recordId"] == entry.record_id
            ),
            None,
        )
        if match is None:
            raise ValueError("no matching RecordAnchored log in our own receipt")
        onchain_hash = "0x" + match["args"]["payloadHash"].hex()
        if onchain_hash != entry.payload_hash:
            raise ValueError(
                f"on-chain hash {onchain_hash} != expected {entry.payload_hash} — service bug"
            )
        entry.version = match["args"]["version"]
    except Exception as exc:
        logger.error("confirm mismatch for %s: %s", entry.tx_hash, exc)
        entry.status = "failed"
        entry.last_error = f"confirmation mismatch: {exc}"
        await entry.save()
        return

    entry.status = "confirmed"
    entry.block_number = receipt["blockNumber"]
    entry.gas_used = receipt["gasUsed"]
    entry.confirmed_at = datetime.now(timezone.utc)
    entry.last_error = None
    await entry.save()
    logger.info(
        "anchor confirmed: %s/%s block=%d version=%s",
        entry.record_type, entry.record_id, receipt["blockNumber"], entry.version,
    )


async def _maybe_resend_if_stuck(w3: Web3, entry: LedgerEntry, now: datetime) -> None:
    """A missing receipt is NOT a failure — Sepolia blocks are ~12s and a
    quiet mempool can take longer. Only act once ANCHOR_SUBMIT_TIMEOUT_SEC has
    passed since submission, and even then only if the nonce is provably not
    yet consumed on-chain — resending a nonce the network already accepted
    would double-broadcast.
    """
    if entry.submitted_at is None:
        return
    elapsed = (now - entry.submitted_at).total_seconds()
    if elapsed < settings.receipt_timeout_seconds:
        return

    account = get_account()
    chain_nonce = await asyncio.to_thread(w3.eth.get_transaction_count, account.address, "latest")

    if chain_nonce > (entry.nonce or -1):
        # The nonce WAS consumed — our tx (or a replacement) landed, we just
        # haven't seen the receipt via this RPC yet. Do nothing; the next
        # tick will find it.
        return

    # Nonce not consumed after a full timeout: the original broadcast was
    # genuinely dropped. Re-send at the SAME nonce with bumped fees.
    logger.warning(
        "tx %s for %s/%s stuck after %.0fs, resending at nonce %d",
        entry.tx_hash, entry.record_type, entry.record_id, elapsed, entry.nonce,
    )
    try:
        contract = get_contract()
        args = (
            entry.record_type,
            entry.record_id,
            entry.mine_id,
            bytes.fromhex(entry.payload_hash[2:]),
        )
        fees = bump_fees(await build_fees(w3))
        gas_estimate = await asyncio.to_thread(
            contract.functions.anchor(*args).estimate_gas, {"from": account.address, "nonce": entry.nonce}
        )
        tx = contract.functions.anchor(*args).build_transaction(
            {
                "from": account.address,
                "nonce": entry.nonce,
                "chainId": settings.chain_id,
                "gas": int(gas_estimate * 1.25),
                **fees,
            }
        )
        signed = account.sign_transaction(tx)
        await asyncio.to_thread(w3.eth.send_raw_transaction, signed.rawTransaction)
        entry.submitted_at = now
        entry.attempts += 1
        await entry.save()
    except Exception as exc:
        # A resend failing with NONCE_TOO_LOW means our counter genuinely
        # drifted from the chain — force the next reserve_nonce() to re-read.
        if "nonce too low" in str(exc).lower():
            reset_nonce()
        entry.last_error = f"resend failed: {exc}"
        await entry.save()
