# Blockchain Audit Ledger — Implementation Plan

> **Last updated:** 2026-09-05 (uncommitted — not yet pushed, exists only in this local working tree) · 
**Status:** CURRENT — the build plan for `blockchain/`; supersedes `research/blockchain_ledger.md` §2–§3 (contract design and backend integration), see "Deviations from existing docs" below

## Context

**The problem.** CoalGuard stores every compliance violation as a ticket in MongoDB. MongoDB is mutable — anyone with DB access can delete or edit a violation the night before a DGMS audit, and the record simply never existed. The entire compliance system is only as trustworthy as its database administrator.

**The fix.** SHA-256 each record and anchor only that 32-byte fingerprint on a public blockchain. A regulator re-hashes the record currently in MongoDB and compares against the chain. Mismatch or absence proves tampering. Nothing confidential leaves the system; a hash reveals nothing about its input.

**Why now.** `research/blockchain_ledger.md` has carried a contract design since 2026-08-26 and `SETUP.md:14` lists `blockchain/` as "early scaffolding," but **no blockchain code has ever existed on any branch**. `backend/requirements.txt` pins `web3==6.19.0` unused, and `backend/Dockerfile:4` installs `build-essential` solely for it. This plan closes that gap.

**Outcome.** A `blockchain/` microservice that anchors any CoalGuard record to Ethereum Sepolia asynchronously, plus a backend connector, plus a public Etherscan page a judge can click to verify a hash themselves.

### Decisions locked with the user

| Decision | Choice |
|---|---|
| Deployment shape | Separate microservice, **not** code inside `backend/` |
| State ownership | **Service owns its own state** — its own `coalguard_ledger` Mongo DB, its own worker |
| Chain | **Ethereum Sepolia** (`chain_id` 11155111), config-driven |
| Anchor scope | **Generic** — `{recordType, recordId, mineId, payloadHash}` for any record type, no redeploy to add one |
| Build scope | Whole `blockchain/` folder + a thin backend connector. **No frontend work.** |

### Deviations from existing docs (all three need updating — see Phase 7)

- `research/blockchain_ledger.md` §3 and `lld.md` §5/§7m put `web3.py` in `backend/src/services/audit.py`. It moves to the service.
- `lld.md` §2 says Polygon testnet → Sepolia.
- `lld.md` §4's `AuditLedgerEntry` backend Beanie doc is **not built** — the service owns that collection instead.
- The doc's `logReport`/`resolveReport` ticket-specific API becomes a generic `anchor()`.

---

## Design

### 1. Contract — `blockchain/contracts/AuditLedger.sol`

Solidity `^0.8.24`, OpenZeppelin `AccessControl`, Hardhat 2 (2.22.x) + `@nomicfoundation/hardhat-toolbox`, JavaScript/CommonJS.

Five corrections to the design in `research/blockchain_ledger.md`, each load-bearing:

**a. `abi.encode`, never `abi.encodePacked`.** `encodePacked` concatenates without length prefixes, so `("ticket","a|b")` and `("ticket|a","b")` produce the *same* key. A separator does not fix this. Use `keccak256(abi.encode(recordType, recordId))`. A test asserting these two differ is the single highest-value test in the suite — it permanently guards against someone "optimizing" it back.

**b. Two-slot struct; identity strings live in events, not storage.** The doc stores `recordType`/`recordId`/`mineId` as strings in the struct — ~60-80k wasted gas per anchor, and pure redundancy since the caller must already know them to derive the lookup key.

```solidity
struct Anchor {
    bytes32 payloadHash; // slot 0
    uint64  anchoredAt;  // ─┐
    address anchoredBy;  //  │ slot 1: 64+160+32 = 256 bits exactly
    uint32  version;     // ─┘
}
mapping(bytes32 recordKey => Anchor[]) private _anchors;
mapping(bytes32 mineKey   => bytes32[]) private _mineRecords;
```

**c. Array of versions, not overwrite.** A ticket is anchored at every status transition. Overwrite proves only current state; the array proves the *lifecycle* — "this ticket was `open`/`CRITICAL` on 12 March, timestamped by Ethereum, so you cannot now claim it was always `LOW`." This closes `lld.md` §7m's open question: **anchor on every status transition**, because the array makes it cheap.

**d. On-chain idempotency + access control.** `if (n > 0 && history[n-1].payloadHash == payloadHash) revert AlreadyAnchored(...)`. Idempotency must be a property of the *system*, not of a mutable database — that's the whole thesis. `anchor()` gated by `ANCHORER_ROLE`; constructor takes `(address admin, address anchorer)` so deploy key and hot key can differ. Custom errors, not `require` strings — cheaper, and `estimate_gas` surfaces the 4-byte selector so the service can mark a revert terminal without spending gas.

**e. `verify()` returns `anchorCount` too, and never reverts.**
```solidity
function verify(string calldata recordType, string calldata recordId, bytes32 payloadHash)
    external view returns (bool found, uint32 version, uint64 anchoredAt, uint32 anchorCount);
```
Without `anchorCount` the caller cannot tell "matches the latest" from "matches an old version" — a *stale copy*, a completely different finding from tampering. `isLatest = found && version == anchorCount - 1`.

Also: `_mineRecords[mKey].push(key)` **only when `n == 0`**, or a record anchored 3× appears 3× in the mine index. Paginated `getRecordKeysByMine(mineId, offset, limit)` + `mineRecordCount`. `anchorBatch` with `MAX_BATCH = 50` — justified by *latency* not gas (20 serial-nonce anchors = 20 × 12s ≈ 4 min vs ~12s batched).

**Events are the index; storage is the verifier.** Index `mineKey` as a second indexed topic on `RecordAnchored` and carry the plaintext strings in it. This is what enables the killer demo: *delete the Mongo record AND wipe the service's database, and every ticket that ever existed is still enumerable from Sepolia alone* via `eth_getLogs`. Requires storing `deployedAtBlock` (§5) since public RPCs cap log ranges.

### 2. Canonical hashing — `blockchain/src/canonical.py`

**This module is frozen on first deploy.** Changing it invalidates every historical anchor. Loud module docstring saying so.

**The seam: backend owns *which* fields (the projection); the service owns *how* bytes are made (the encoding).** A single shared encoder does not save you from the real failure mode, which is field-set drift — add `escalation_history` to `Ticket` in November and every historical anchor fails verification forever, indistinguishable from real tampering.

**Include-lists, never exclude-lists.** An exclude-list fails *open* (silently includes every new field); an include-list fails *closed* (old anchors keep verifying). Projection functions are frozen; a new field means `_build_ticket_v2` + `payload_version=2`, with v1 kept forever.

**Envelope, for domain separation** — never hash the bare payload, or an anchor proving ticket A can be replayed as proof for ticket B:

```python
DOMAIN_TAG = b"coalguard-audit-ledger/v1\n"

def canonical_bytes(*, record_type, record_id, mine_id, payload_version, payload) -> bytes:
    envelope = {"v": int(payload_version), "type": record_type,
                "id": record_id, "mine": mine_id, "payload": payload}
    body = json.dumps(_canonicalize(envelope), sort_keys=True,
                      separators=(",", ":"), ensure_ascii=False,
                      allow_nan=False).encode("utf-8")
    return DOMAIN_TAG + body
```

`_canonicalize` runs recursively before `json.dumps`. Every rule with its reason:

| Input | Output | Why |
|---|---|---|
| `dict` | recurse; non-`str` key → **raise** | int key `1` would silently collide with str `"1"` |
| `bool` | as-is, **dispatched before `int`** | `isinstance(True, int)` is `True`; wrong order hashes `True` as `1` |
| `float` | **raise** | quantize upstream to a string (lat/lng 7dp, tonnage 3dp) |
| `str` | `unicodedata.normalize("NFC", s)` | Devanagari/accents have multiple byte encodings for identical text |
| `None` | `null`, **key kept** | dropping nulls makes unassigning a ticket invisible |
| `datetime` | UTC, **truncated to milliseconds**, `…T…:….sssZ` | **the single most likely silent killer** — BSON is ms, Python is µs; hash at anchor time, read back ms-truncated at verify time, and every verification fails forever |
| naive `datetime` | **raise** | silent 5.5h offset in an Indian deployment |
| `ObjectId` | `str(v)` | |
| `list`/`tuple` | element-wise, **order preserved** | order is semantic for `comments`, `escalation_history` |
| `set` / `bytes` | **raise** | no defined order / not projectable |
| anything else | **raise `CanonicalizationError`** | never `str(x)` fallback — a type change would silently change the hash |

Caveat for the docstring: this is **JCS-like, not RFC 8785** (Python sorts by code point, JCS by UTF-16 code unit; diverges only for non-BMP chars, and our keys are ASCII).

### 3. Service — `blockchain/src/`

FastAPI + web3.py + Beanie against its own `coalguard_ledger` DB on the shared mongo container. `blockchain/src/main.py` follows `ai_engine/src/main.py` house style (module docstring with `Endpoints:` block, `# ── … ──` / `# ═══ … ═══` banners, `%(asctime)s │ %(levelname)-8s │ …` log format). `blockchain/src/config.py` mirrors `backend/src/config.py`.

**Four statuses, not three:** `pending → submitted → confirmed | failed`. Three cannot distinguish "not sent yet" from "sent, in mempool, awaiting receipt" — on restart the worker re-sends in-flight transactions and double-anchors.

- **Persist `tx_hash` + `nonce` *before* broadcasting** (compute the hash locally from the signed payload). Order: sign → write `status=submitted` → `eth_sendRawTransaction`. A crash between the two leaves a recoverable record, not an orphaned on-chain tx.
- **A receipt timeout is not a failure.** Only re-send once `eth_getTransactionCount(addr,"latest") > tx.nonce` *and* still no receipt. Run as a separate reconcile pass each cycle.

**`LedgerEntry`** (repo conventions: `typing.Optional`, `Literal` alias, inner `class Settings`, `datetime.now(timezone.utc)`): `record_type`, `record_id`, `mine_id`, `payload_version`, `payload_hash`, `version`, `status`, `tx_hash`, `nonce`, `block_number`, `gas_used`, `chain_id`, `contract_address`, `attempts`, `last_error`, `created_at`, `submitted_at`, `confirmed_at`.

Indexes — a **deliberate deviation** (no Beanie index declarations exist anywhere in the repo), justified because the worker poll and the idempotency guarantee structurally depend on them: `(status, created_at)`; `(record_type, record_id, version)` unique with `partialFilterExpression` on `version` being an int; `(mine_id, created_at desc)`; sparse `tx_hash`.

Note: **do not** put a unique index on `(record_type, record_id, payload_hash)` — it would reject a legitimate re-anchor of a ticket bouncing `in_progress → open → in_progress`, disagreeing with the contract, which only rejects a match against the *latest*.

**The queue is the `LedgerEntry` collection itself** — an in-process `asyncio.Queue` makes the feature self-refuting: a restart silently drops every unanchored record, which is precisely the disappearing-record failure this exists to prevent. Poll `find({status:"pending"}).sort(created_at)`, plus an `asyncio.Event` nudge set on insert so the common case has queue latency with outbox durability.

**web3.py 6.x is synchronous.** `wait_for_transaction_receipt` blocks its thread for 12–180s — called from a coroutine it freezes the entire app including `/health`. Wrap every chain call in `await asyncio.to_thread(...)`. The worker is serial by design, so nothing is lost.

**Nonce:** read `get_transaction_count(addr, "pending")` once at startup, then increment **in memory**. Re-querying per tx against a public RPC returns stale values and produces duplicate-nonce errors.

**Gas (Sepolia is EIP-1559, never legacy `gasPrice`):** `maxPriorityFeePerGas = w3.eth.max_priority_fee` (fallback 1.5 gwei), `maxFeePerGas = 2 × baseFee + priority`, `gas = estimate_gas() × 1.25`. `estimate_gas` doubles as a free pre-flight — an `AlreadyAnchored` or role revert becomes terminal at zero cost.

**Out of test ETH — the designed degradation** (this *will* happen): balance cached ~60s; below threshold → `/health` reports `signer.ready: false`, overall `degraded`; **entries stay `pending` and `attempts` is NOT incremented** — refill and the backlog drains itself; `POST /anchor` still returns 202.

**Endpoints** — `APIRouter(prefix="/api/ledger", tags=["ledger"])` (`/api` prefix like `ai_engine`, unlike `backend`):

| Method | Path | Auth | Notes |
|---|---|---|---|
| `POST` | `/api/ledger/anchor` | API key | **202** + `{entry_id, payload_hash, status, existing}` |
| `POST` | `/api/ledger/anchor/batch` | API key | |
| `POST` | `/api/ledger/verify` | open | the demo — five verdicts below |
| `GET` | `/api/ledger/entries/{id}`, `/api/ledger/entries?status=` | open | ops view of the queue |
| `GET` | `/api/ledger/records/{type}/{id}` | open | history from the service DB |
| `GET` | `/api/ledger/records/{type}/{id}/onchain` | open | **RPC only, no DB read** |
| `GET` | `/api/ledger/mines/{mine_id}/onchain` | open | **`eth_getLogs` replay** — §1 |
| `POST` | `/api/ledger/entries/{id}/retry` | API key | requeue a terminal failure after refilling |
| `GET` | `/api/ledger/stats`, `/health` | open | |

The two `/onchain` endpoints matter more than they look: every other read hits the service's own mutable Mongo, which is circular for an anti-tampering tool. **The ledger DB is a queue and a cache, never the trust anchor** — state that in the README and the weakness becomes the architecture.

**Verify returns five verdicts, never collapsed** — a tool that reports TAMPERED because an RPC timed out is worse than useless:

| Verdict | Meaning |
|---|---|
| `VERIFIED` | matches the latest on-chain version |
| `STALE` | matches an older version — changed but never re-anchored, or you hold an old copy |
| `TAMPERED` | anchors exist; this hash matches none |
| `NOT_ANCHORED` | no anchors — **not proof of tampering**, may predate the ledger |
| `UNAVAILABLE` | RPC unreachable. No verdict rendered. |

**`/health`** matches ai_engine's `{"status","modules":{name:{"ready",...}}}` exactly. Modules: `mongo` (ping), `rpc` (reachable **and `chain_id` matches** — catches "deployed to Sepolia but `.env` still points at the Hardhat address"), `contract` (`len(get_code(addr)) > 2`), `signer` (`{ready, address, balance_eth, has_anchorer_role}` — the on-chain `hasRole` check is worth more than the rest combined; it catches "we redeployed and forgot to grant the role," which otherwise presents as every tx reverting for no visible reason), `worker` (`last_tick_at`, `pending_count`, `submitted_count`).

**`ANCHOR_ENABLED=false`** lets the whole stack run with no RPC and no key — essential when one person holds the funded wallet. Consequence: chain credential vars are `Optional[str] = None` and gated at runtime, a **scoped deviation** from the repo's no-defaults convention (infra vars like `mongodb_uri`/`chain_id` keep no defaults). Private key is `pydantic.SecretStr` so an accidental `print(settings)` or a validation-error echo prints `**********`.

### 4. Security

1. `.env` in `blockchain/.dockerignore` (copy `backend/.dockerignore` verbatim — it already lists it). A key baked into an image layer survives `docker rmi` and gets pushed to any registry.
2. Root `.gitignore:151` is a bare `.env` matching at any depth, so `blockchain/.env` is **already** covered — don't add a redundant rule implying otherwise.
3. Never log the settings object. Log only `signer_address`.
4. **A fresh throwaway wallet, never a personal MetaMask key.** The same private key controls the same address on every EVM chain; a reused key in a screen-share is the #1 real hackathon incident. Bold in the README.
5. Admin role on the deploy key, `ANCHORER_ROLE` on the hot key. Deploy script takes `ANCHORER_ADDRESS` from env (defaulting to deployer) so separation is a config change, not a code change.
6. **Shared-secret header on `/anchor`, not JWT.** Service-to-service. Forwarding the user JWT means the ledger service needs the JWT secret and has to model users. One `LEDGER_API_KEY` compared with `secrets.compare_digest` (constant-time — never `==`).
7. **Bind `127.0.0.1:8003:8000`.** Correcting my own assumption: only `backend` and `ai_engine` are published wide, and those have browser clients. This service has none — the frontend talks only to `backend`. Loopback-binding removes denial-of-wallet from the LAN entirely, and is strictly better than any auth scheme. Backend still reaches it at `http://blockchain:8000`.

### 5. Hardhat, Docker, artifacts

**Hardhat 2 + toolbox, JavaScript/CommonJS.** Hardhat 3 is ESM-only and viem-first, so most tutorials and StackOverflow answers don't apply — which matters at 2am with teammates who've never written Solidity. Ignition (bundled) as primary deploy, with a 20-line `scripts/deploy.js` fallback because Ignition's errors are worse when a Sepolia tx sticks. `hardhat.config.js` must tolerate a missing key: `accounts: process.env.DEPLOYER_PRIVATE_KEY ? [...] : []`, or `npx hardhat test` — which needs no key — crashes for every teammate.

**`npx hardhat verify --network sepolia` is a phase deliverable, not a nice-to-have.** A verified contract gives judges a browser page where **Read Contract → `verify(...)`** checks a hash with zero tooling, and an **Events** tab showing every `RecordAnchored` decoded in plaintext. That page is the single highest-leverage asset in this feature; it costs one command and a free Etherscan key.

**The runtime image is Python-only.** The service needs no Node — which dissolves rather than solves the `node_modules` shadowing question. `blockchain/Dockerfile` is a near-copy of `backend/Dockerfile`, **keeping the `build-essential` apt block and its comment verbatim** ("web3's pinned lru-dict has no cp312 wheel") — it becomes true here rather than in `backend`. Bind-mount only `./blockchain/src:/app/src`.

**ABI committed at `blockchain/abi/AuditLedger.json`**, trimmed to `{"abi":[...]}` (not Hardhat's 30KB artifact, whose bytecode churns every compile). `npm run export:abi` generates it; `npm run check:abi` re-exports to a temp path and diffs, run in the test phase to catch drift. Committed rather than built in the image so a fresh clone + `docker compose up` works with **zero Node installed** — extending SETUP.md's existing "you don't need Python locally" promise.

**Address: `CONTRACT_ADDRESS` env var falling back to `deployments/sepolia.json`** (committed): `{chainId, network, address, deployedAtBlock, deployedAt, txHash, deployer}`. **`deployedAtBlock` is load-bearing** — it's the `fromBlock` for event replay; without it you scan from genesis and every public RPC rejects the request. On startup assert chain id and `get_code != b""`; log ERROR and go degraded, don't crash.

**Optional local chain under a compose profile** — justified less as demo insurance than as the only way a teammate with no Sepolia key can exercise the full stack:
```yaml
hardhat:
  profiles: ["chain"]
  image: node:20-alpine
  working_dir: /app
  command: sh -c "npm ci && npx hardhat node --hostname 0.0.0.0"
  ports: ["127.0.0.1:8546:8545"]
  volumes: [./blockchain:/app, /app/node_modules]   # anonymous vol: host arm64 build must not shadow the container's
```
Chain id 31337. Document account #0's key as publicly known, dev-only, and that using it on a real network loses funds within seconds (bots sweep it continuously). `deployments/localhost.json` is gitignored. Honest caveat for the docs: a local chain proves the plumbing, not the story — nothing is public, nothing a judge can click.

### 6. Backend connector

**Drop `web3==6.19.0` from `backend/requirements.txt`, and with it the `build-essential` block from `backend/Dockerfile`** (its comment says it exists solely for web3). Third and real reason beyond "it's unused": leaving `web3` importable in `backend` invites someone to "just" put a bit of chain code there, which is exactly the decision locked against. Add `httpx==0.27.0` explicitly (it may arrive transitively via fastapi — pin it anyway).

**Making the connector real rather than dead code: anchor a record type that already exists.** `Mine` is a real Beanie document today, and mine registration is genuinely something an operator would want to quietly edit. **Correction to note:** `backend/src/models/mine.py` currently has only `subsidiary_id` and `name` — not the `boundary_geojson`/EC caps of `lld.md` §4. So `_build_mine_v1` projects exactly `("name", "subsidiary_id")`, frozen; the richer fields become `_build_mine_v2` when the model catches up.

`backend/src/services/audit_service.py` — module-level `async def`, keyword-only via bare `*`, `_`-prefixed helpers, domain exception `LedgerError` (never `HTTPException`), following `backend/src/services/auth_service.py:7`'s `AuthError` pattern exactly:

```python
PAYLOAD_BUILDERS = {"mine": _build_mine_v1}   # + a commented "ticket": _build_ticket_v1
                                              #   stub carrying lld.md §4's field list
async def anchor_record(*, record_type, record_id, mine_id, payload) -> dict
async def verify_record(*, record_type, record_id, mine_id, payload) -> dict
async def get_record_history(*, record_type, record_id) -> list[dict]
```

**The key shaping decision: `anchor_record` swallows transport errors by design** — logs a warning, returns `{"status": "unavailable"}`. Callers never need `try/except`, so a ticket create can never 500 because the ledger is down. `verify_record` **raises**, because a verify with no answer must never be mistaken for a pass. Module-level `httpx.AsyncClient` singleton, `timeout=Timeout(5.0, connect=2.0)`, closed by one line in `main.py`'s existing `lifespan` teardown.

**Invariant, stated loudly in the README:** *anchoring is best-effort and eventually consistent. Mongo is the source of truth for the application; Sepolia is the source of truth for integrity. A chain outage must never fail a ticket creation.*

`backend/src/routes/audit.py` — `APIRouter(prefix="/audit", tags=["audit"])`, no `/api` (backend convention), body param `payload`, `status.HTTP_*`, `raise … from exc`:
- `POST /audit/verify/{record_type}/{record_id}` — `require_user_types("regulatory_authority", "admin")`, literally `lld.md` §7m's story using the existing dependency factory. Also the single-origin proxy so the frontend only ever hits `VITE_API_URL`.
- `GET /audit/records/{record_type}/{record_id}` — history proxy
- `POST /audit/anchor/{record_type}/{record_id}` — admin-only manual anchor, makes the demo scriptable

`backend/scripts/anchor_mines.py` follows the `scripts/` pattern (outside `src/`, absolute `from src.…`, `scripts/db.py`'s `connect()`, emoji progress). **Do not wire it into `scripts/index.py`** — that's the seed orchestrator, and a network call there would make `npm run dev:seed` fail whenever the chain is down.

Config additions to `backend/src/config.py` (no defaults, per convention): `blockchain_url: str`, `ledger_api_key: str`.

---

## Files

**New — `blockchain/`**
```
contracts/AuditLedger.sol            test/AuditLedger.test.js
ignition/modules/AuditLedger.js      scripts/{deploy,grant-anchorer,export-abi,anchor-demo}.js
abi/AuditLedger.json      (committed)  deployments/sepolia.json  (committed)
hardhat.config.js  package.json
src/main.py  src/config.py  src/canonical.py  src/worker.py  src/auth.py
src/models/ledger_entry.py  src/chain/{client,signer,gas}.py
src/services/{ledger_service,verify_service,onchain_service}.py  src/routes/ledger.py
tests/test_canonical.py   requirements.txt  requirements-dev.txt
Dockerfile  .dockerignore  .env.example  README.md
```

**Modified**
- `backend/requirements.txt` — drop `web3`, add `httpx==0.27.0`
- `backend/Dockerfile` — drop the `build-essential` apt block (moves to `blockchain/Dockerfile`)
- `backend/src/config.py` — `blockchain_url`, `ledger_api_key`; `backend/.env.example` to match
- `backend/src/main.py` — register `audit_router`, close the httpx client in `lifespan`
- **New:** `backend/src/services/audit_service.py`, `backend/src/routes/audit.py`, `backend/src/schemas/audit.py`, `backend/scripts/anchor_mines.py`
- `docker-compose.yml` — `blockchain` service (`127.0.0.1:8003:8000`), profiled `hardhat` service
- `package.json` — `chain:compile|test|deploy:sepolia|verify|node`; add `blockchain` to `dev:up` (it's light, unlike `ai_engine`, and a dev without it just gets confusing connection-refused noise)
- `.gitignore` — `# Blockchain / Hardhat` block: `blockchain/{artifacts,cache,typechain-types,coverage}/`, `blockchain/coverage.json`, `blockchain/ignition/deployments/chain-31337/`, `blockchain/deployments/localhost.json`. **Explicitly do NOT ignore** `blockchain/abi/`, `blockchain/deployments/sepolia.json`, `chain-11155111/`. Also fix line 17 `lib/` → `/lib/` (unanchored, would silently swallow any `blockchain/**/lib/`)
- `SETUP.md`, `research/lld.md` (§2, §4, §5, §7m), `research/blockchain_ledger.md` — see Phase 7

---

## Build sequence

Phase 0 also copies this plan to `BLOCKCHAIN_PLAN.md` at the repo root, with the repo's standard `> **Last updated:** … · **Status:** CURRENT` stamp, so the team can see it. (`research/` is where design docs normally live — flagging that, but going with root as asked.)

| Phase | Work | Verified by | Needs wallet + internet? |
|---|---|---|---|
| **0** | `.gitignore` block + `/lib/` fix; drop `web3` + `build-essential` from backend; pin `httpx`; copy this plan to repo root | `npm run dev:up` still works; backend image builds smaller | no |
| **1** | Contract + full Hardhat test suite | `npx hardhat test` green, `npx hardhat coverage` | **no** |
| **2** | Faucet → deploy to Sepolia → `hardhat verify` → `export:abi` → `deployments/sepolia.json` → grant anchorer | A **public Etherscan URL**, green "Source Code Verified", a `RecordAnchored` event from `anchor-demo.js` | yes |
| **3** | `canonical.py` + `tests/test_canonical.py` + `requirements-dev.txt` | `pytest` green; golden vectors in the README | **no** |
| **4** | Service with `ANCHOR_ENABLED=false`: config, model, routes, main, Dockerfile, compose | `curl :8003/health` alive-but-degraded; anchor → 202 + a `pending` entry; `/docs` renders | **no** |
| **5** | Chain wiring: client, signer, gas, worker, reconcile, verify + `/onchain` | Anchor → `confirmed` in ~30s with a clickable tx | yes |
| **6** | Backend connector + `mine` builder + `anchor_mines.py` | end-to-end verify as the seeded regulator (below) | yes |
| **7** | `hardhat` compose profile; all doc updates; `chain:*` scripts | full flow at `CHAIN_ID=31337` with **no internet** | no |

Phases 1, 3 and 4 need no wallet and no network — three people can work in parallel, and only one person ever needs the funded wallet.

### Nothing here costs real money

**Total spend on this feature: ₹0.** Sepolia ETH is free faucet test currency with no market value; the RPC provider (Alchemy/Infura) and Etherscan API both have free tiers that cover this comfortably; the wallet you generate yourself. The "yes" column above means *needs the funded wallet and internet* — test ETH is free but you still have to go claim it, and faucets rate-limit to ~0.05 ETH/day, which is the only reason those phases can't run offline.

**Never fund this wallet with real ETH, and never reuse a personal MetaMask key** — the same private key controls the same address on mainnet, so a key that appears in a screen-share is a real loss.

**Sepolia practicalities.** Faucet: **Google Cloud Web3** (0.05 ETH/day, no mainnet-balance requirement) is the reliable one; Alchemy needs ≥0.001 mainnet ETH; `sepolia-faucet.pk910.de` (browser PoW) works when everything else rate-limits. **Claim from two sources a week before demo day, not the night before.** An `anchor()` is ~90–120k gas (~0.00012 ETH at 1 gwei), deploy ~1.5M — one 0.05 ETH claim covers hundreds of anchors plus several redeploys; hold ~0.2 ETH in case base fee spikes. 12s slots; `wait_for_transaction_receipt` returns on inclusion, so quote judges **~12–24s**, not finality. Get a free Alchemy/Infura RPC key — needed anyway for `eth_getLogs` over wide ranges.

---

## Verification

**Contract (Phase 1)** — `cd blockchain && npx hardhat test`. Cases that matter most: `("ticket","a|b")` vs `("ticket|a","b")` produce different `recordKey` (the permanent `encodePacked` guard); re-anchor identical-to-latest reverts `AlreadyAnchored`; `verify` with a wrong hash returns `found=false` and **does not revert**; `verify` on an unknown record → `anchorCount=0`; 3 records with one anchored 3× → `mineRecordCount == 3` not 5; non-anchorer reverts `AccessControlUnauthorizedAccount`; a loose gas upper bound (first anchor < 200k) to catch reintroduced string storage; Devanagari `mineId`.

**Hashing (Phase 3)** — `docker compose exec blockchain pytest`. Adding pytest to a repo with no test framework is a real deviation, warranted here and essentially nowhere else: every other part of this repo is verifiable by looking at it, but a canonicalization bug is invisible until months later when a hash mismatches and **you cannot tell whether it's your bug or actual tampering**. Scope it to `tests/test_canonical.py` only, `pytest` in `requirements-dev.txt` so it never enters the runtime image.

The single highest-value assertion, using `bson` from the already-present `pymongo` — it directly proves the millisecond-truncation trap is handled:
```python
assert canonical_bytes(**d) == canonical_bytes(**bson.decode(bson.encode(d)))
```
Plus golden vectors (fixed dict → hardcoded digest), key-order independence, `+05:30` == same instant in UTC, naive datetime raises, `{"a": null}` ≠ `{}`, `{"a": true}` ≠ `{"a": 1}`, NFC composed == decomposed, list order significant, unsupported type raises, and same payload + different `record_id` → different hash (envelope binding).

**End-to-end (Phase 6) — this triple is the demo script.** With the stack up and mines seeded:
1. `docker compose exec backend python -m scripts.anchor_mines` → entries go `pending → submitted → confirmed`, each with a clickable `sepolia.etherscan.io/tx/…`.
2. Log in as the seeded `regulator@example.com` (password from `seed_users.py`), `POST /audit/verify/mine/<id>` → **`VERIFIED`**.
3. `mongosh` → hand-edit that mine's `name` → verify again → **`TAMPERED`**.
4. Delete the mine entirely → `GET /api/ledger/mines/<mine_id>/onchain` still enumerates it from Sepolia alone → deletion is provable.
5. Stop the service, wipe `coalguard_ledger`, restart → step 4 still works. **The ledger DB is a cache; the chain is the truth.**

**Offline (Phase 7)** — `docker compose --profile chain up -d hardhat`, point `CHAIN_ID=31337` / `RPC_URL=http://hardhat:8545`, redeploy, and run the same flow with networking off.