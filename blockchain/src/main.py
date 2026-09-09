"""
CoalGuard Blockchain Ledger — FastAPI Gateway
==============================================
Anchors SHA-256 fingerprints of CoalGuard records to an on-chain AuditLedger
contract (Ethereum Sepolia by default), and lets anyone re-hash a record and
ask the chain — never this service's own database — whether that hash was
ever anchored.

Owns its own `coalguard_ledger` MongoDB database. Mongo remains the source of
truth for the application; the chain is the source of truth for integrity.
This service's own database is a queue and a cache, not the trust anchor —
see src/services/onchain_service.py.

Endpoints:
    GET  /health                                    → service + chain health
    POST /api/ledger/anchor                         → enqueue one anchor (API key)
    POST /api/ledger/anchor/batch                    → enqueue several (API key)
    POST /api/ledger/verify                          → re-hash + check the chain (open)
    GET  /api/ledger/entries/{id}                     → one queue entry
    GET  /api/ledger/entries?status=                  → the queue, filtered
    POST /api/ledger/entries/{id}/retry               → requeue a failed entry (API key)
    GET  /api/ledger/records/{type}/{id}              → this service's own history
    GET  /api/ledger/records/{type}/{id}/onchain      → RPC only, no DB read
    GET  /api/ledger/mines/{mine_id}/onchain          → eth_getLogs replay
    GET  /api/ledger/stats                            → queue counts
"""

from __future__ import annotations

import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import worker
from .config import settings
from .db import connect
from .routes.ledger import router as ledger_router

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s │ %(levelname)-8s │ %(name)s │ %(message)s",
)
logger = logging.getLogger("blockchain")


# ── Lifespan ──────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.mongo_client = await connect()
    logger.info(
        "connected to %s (anchor_enabled=%s)", settings.mongodb_db_name, settings.anchor_enabled
    )

    worker_task = asyncio.create_task(worker.run_forever())

    yield

    worker_task.cancel()
    try:
        await worker_task
    except asyncio.CancelledError:
        pass
    app.state.mongo_client.close()


# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="CoalGuard Blockchain Ledger",
    description="Anchors record hashes to Ethereum Sepolia and verifies them against tampering.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ledger_router)


@app.get("/health")
async def health() -> dict:
    from . import health as health_module

    return await health_module.check()
