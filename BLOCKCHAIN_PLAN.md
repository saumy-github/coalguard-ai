# Blockchain Audit Ledger — Implementation Plan

> **Last updated:** 2026-09-08 (uncommitted — not yet pushed, exists only in this local working tree) ·
**Status:** BUILT — every phase except **Phase 2 (Sepolia deployment)** is implemented and verified end-to-end against a local Hardhat chain. Phase 2 needs a Sepolia RPC URL and a funded throwaway wallet, which only a human can obtain. `research/blockchain_ledger.md` has been rewritten to describe what was built; this file keeps the design rationale and the build log.

## Context

**The problem.** CoalGuard stores every compliance violation as a ticket in MongoDB. MongoDB is mutable — anyone with DB access can delete or edit a violation the night before a DGMS audit, and the record simply never existed. The entire compliance system is only as trustworthy as its database administrator.

**The fix.** SHA-256 each record and anchor only that 32-byte fingerprint on a public blockchain. A regulator re-hashes the record currently in MongoDB and compares against the chain. Mismatch or absence proves tampering. Nothing confidential leaves the system; a hash reveals nothing about its input.

**Outcome.** A `blockchain/` microservice that anchors any CoalGuard record to Ethereum Sepolia asynchronously, plus a backend connector, plus a public Etherscan page a judge can click to verify a hash themselves.

### Decisions locked with the user

| Decision | Choice |
|---|---|
| Deployment shape | Separate microservice, **not** code inside `backend/` |
| State ownership | **Service owns its own state** — its own `coalguard_ledger` Mongo DB, its own worker |
| Chain | **Ethereum Sepolia** (`chain_id` 11155111), config-driven |
| Anchor scope | **Generic** — `{recordType, recordId, mineId, payloadHash}` for any record type, no redeploy to add one |
| Build scope | Whole `blockchain/` folder + a thin backend connector. **No frontend work.** |

### Corrections applied during implementation

The plan was written against a slightly older tree. Three assumptions did not hold and were corrected in the build:

1. **`Mine` has no `subsidiary_id`.** It is `name`, `lat`, `lng` (subsidiary was deleted in the profile refactor). `_build_mine_v1` therefore projects `("name", "lat", "lng")`, with lat/lng quantised to 7-dp **strings** — which is exactly what the canonicaliser's float ban requires.
2. **The auth dependency is `require_role`, and the role is `regulator`.** Not `require_user_types("regulatory_authority", …)`; those names predate the role rename.
3. **`backend/src/config.py` now gives every field a default.** The plan said "no defaults, per convention", but that convention changed — new fields follow the file as it actually is, so a teammate without the new vars can still boot the backend.

A fourth was found by building: **dropping `web3` from the backend also dropped `requests`**, which `src/auth/google.py` needs via `google.auth.transport.requests`. It is now declared explicitly in `backend/requirements.txt`.

### Bugs the local chain caught (Phase 5/7)

None of these are visible without actually broadcasting a transaction, which is exactly why the offline Hardhat chain was built before asking anyone for a faucet. All three would have surfaced for the first time mid-demo.

1. **`signed.raw_transaction` does not exist on the pinned stack.** `web3==6.19.0` pulls `eth-account 0.11`, where the attribute is `rawTransaction`; it was renamed in 0.13. Both broadcast paths in `worker.py` would have died with `AttributeError` on the first real anchor. Verified against the installed version rather than assumed.
2. **`verify()` was passed the payload hash as a `0x…` string.** web3 6 type-checks `bytes32` arguments strictly and rejects a hex string. The call sat inside a broad `except Exception` that maps failures to `UNAVAILABLE` — so verification would have failed permanently while looking merely degraded. Now converted with `bytes.fromhex(...)`, matching what the worker already did.
3. **`CONFIRMATIONS_REQUIRED` must be `0` on a local chain.** Hardhat mines only when a transaction arrives, so the last anchor of any burst waits forever for a confirmation block nothing will produce. Correct and desirable on Sepolia (~12s blocks, real reorgs); wrong offline. Documented in both `.env` files.

A fourth, smaller one, in the backend connector: `verify` returned **502** for a record that does not exist, conflating "this mine is gone" with "the ledger is unreachable" — the exact collapsing the five-verdict design exists to prevent. Split into `RecordNotFound` → 404.

### The redeploy bugs — two of one kind

Redeploying the contract (an upgrade, or just a second local deploy) broke the service in two separate places, both from the same root assumption: **treating per-deployment state as if it were global.** `version` is a counter that restarts at 0 on every new contract, and both of these forgot that.

5. **Idempotency ignored the contract address.** `enqueue_anchor` reused any non-terminal entry with a matching hash — including one `confirmed` against a contract we no longer point at. After a redeploy the service therefore refused to re-anchor anything, and every record read `NOT_ANCHORED` forever while the queue insisted it was `confirmed`: **the ledger's own database contradicting the chain**, which is the single thing this service must never do. Reuse is now scoped to the current `chain_id` + resolved contract address (compared case-insensitively — EIP-55 checksumming means the same address arrives with different capitalisation from an env var than from web3).
6. **The unique index ignored it too.** `(record_type, record_id, version)` collided the moment a record was re-anchored on a new contract at its version 0, since the old contract's version 0 was already there. The entry could never be marked `confirmed` — it sat in `submitted` forever while the anchor sat happily on chain, with a `DuplicateKeyError` surfacing confusingly as Beanie's `RevisionIdWasChanged`. `contract_address` is now part of the key. **Dropping the old index is a manual step** on any database that already has it: `db.ledger_entries.dropIndex('record_type_1_record_id_1_version_1')` — Beanie creates the new index but does not remove the superseded one.

Both were found by actually redeploying, not by reading the code. Worth keeping in mind before the Sepolia deploy: it is the first redeploy the service will ever see.

### Deviations from existing docs (all three need updating — Phase 7)

- `research/blockchain_ledger.md` §3 and `lld.md` §5/§7m put `web3.py` in `backend/src/services/audit.py`. It moves to the service.
- `lld.md` §2 says Polygon testnet → Sepolia.
- `lld.md` §4's `AuditLedgerEntry` backend Beanie doc is **not built** — the service owns that collection instead.
- The doc's `logReport`/`resolveReport` ticket-specific API becomes a generic `anchor()`.

---

## Design

### 1. Contract — `blockchain/contracts/AuditLedger.sol`

Solidity `^0.8.24`, OpenZeppelin `AccessControl`, Hardhat 2 + `@nomicfoundation/hardhat-toolbox`, JavaScript/CommonJS.

Five corrections to `research/blockchain_ledger.md`, each load-bearing:

**a. `abi.encode`, never `abi.encodePacked`.** `encodePacked` concatenates without length prefixes, so `("ticket","a|b")` and `("ticket|a","b")` produce the *same* key. A separator does not fix this. Use `keccak256(abi.encode(recordType, recordId))`. The test asserting those two differ is the highest-value test in the suite.

**b. Two-slot struct; identity strings live in events, not storage.** Storing `recordType`/`recordId`/`mineId` as strings wastes ~60–80k gas per anchor and is redundant — the caller must already know them to derive the key.

**c. Array of versions, not overwrite.** Overwrite proves only current state; the array proves the *lifecycle*. This closes `lld.md` §7m's open question: **anchor on every status transition**.

**d. On-chain idempotency + access control.** Re-anchoring a hash identical to the latest reverts `AlreadyAnchored`. Idempotency must be a property of the *system*, not of a mutable database. `anchor()` is gated by `ANCHORER_ROLE`; custom errors so `estimate_gas` surfaces a 4-byte selector and the service can mark a revert terminal without spending gas.

**e. `verify()` returns `anchorCount` too, and never reverts.** Without it the caller cannot distinguish "matches the latest" from "matches an old version" — a *stale copy*, a completely different finding from tampering.

**Events are the index; storage is the verifier.** `mineKey` is a second indexed topic carrying plaintext strings, which enables the killer demo: delete the Mongo record *and* wipe the service DB, and every ticket is still enumerable from Sepolia alone.

### 2. Canonical hashing — `blockchain/src/canonical.py`

**Frozen on first deploy.** Changing it invalidates every historical anchor.

**The seam: backend owns *which* fields (the projection); the service owns *how* bytes are made (the encoding).** Include-lists, never exclude-lists — an exclude-list fails *open*, an include-list fails *closed*.

**Envelope for domain separation** — never hash the bare payload, or an anchor proving ticket A can be replayed as proof for ticket B.

Key encoding rules, each with its reason: `bool` dispatched **before** `int` (`isinstance(True, int)` is `True`); `float` **raises** (quantise upstream); `datetime` truncated to **milliseconds** (BSON is ms, Python is µs — the single most likely silent killer); naive `datetime` **raises**; `str` NFC-normalised; `None` kept, not dropped; list order preserved; anything unrecognised **raises** rather than falling back to `str(x)`.

### 3. Service — `blockchain/src/`

FastAPI + web3.py + Beanie against its own `coalguard_ledger` DB.

**Four statuses:** `pending → submitted → confirmed | failed`. Three cannot distinguish "not sent yet" from "sent, awaiting receipt" — on restart the worker would re-send in-flight transactions and double-anchor.

- Persist `tx_hash` + `nonce` **before** broadcasting.
- A receipt timeout is **not** a failure; only re-send once the nonce is provably consumed and there is still no receipt.
- **The queue is the collection itself** — an in-process `asyncio.Queue` would silently drop unanchored records on restart, which is precisely the failure this feature exists to prevent.
- **web3.py 6.x is synchronous** — every chain call wrapped in `await asyncio.to_thread(...)`, or `wait_for_transaction_receipt` freezes the whole app including `/health`.
- Nonce read once at startup, then incremented in memory.
- EIP-1559 gas, never legacy `gasPrice`. `estimate_gas` doubles as a free pre-flight.
- **Out of test ETH is a designed degradation:** entries stay `pending`, `attempts` is *not* incremented, `/health` reports `degraded`, and the backlog drains itself on refill.

**Verify returns five verdicts, never collapsed:** `VERIFIED`, `STALE`, `TAMPERED`, `NOT_ANCHORED`, `UNAVAILABLE`. A tool that reports TAMPERED because an RPC timed out is worse than useless.

**The ledger DB is a queue and a cache, never the trust anchor.** The two `/onchain` endpoints read the chain directly, with no DB read.

### 4. Security

1. `.env` in `blockchain/.dockerignore`.
2. Root `.gitignore`'s bare `.env` already covers `blockchain/.env` — verified, no redundant rule added.
3. Never log the settings object; `SecretStr` for the key.
4. **A fresh throwaway wallet, never a personal MetaMask key.**
5. Admin role on the deploy key, `ANCHORER_ROLE` on the hot key.
6. Shared-secret header on `/anchor`, compared with `secrets.compare_digest`.
7. **Bind `127.0.0.1:8003:8000`** — this service has no browser client, so loopback-binding removes denial-of-wallet from the LAN entirely.

### 5. Hardhat, Docker, artifacts

Hardhat 2 + toolbox, JavaScript/CommonJS (Hardhat 3 is ESM-only and viem-first — most answers online would not apply). `hardhat.config.js` tolerates a missing key so `npx hardhat test` works for every teammate.

`npx hardhat verify --network sepolia` is a **phase deliverable**: it gives judges a browser page where **Read Contract → `verify(...)`** checks a hash with zero tooling.

The runtime image is **Python-only** — the service needs no Node. ABI committed at `blockchain/abi/AuditLedger.json`; address from `CONTRACT_ADDRESS` falling back to committed `deployments/sepolia.json`, whose **`deployedAtBlock` is load-bearing** as the `fromBlock` for event replay.

### 6. Backend connector

`anchor_record` **swallows transport errors by design** — a chain outage must never fail a ticket creation. `verify_record` **raises**, because a verify with no answer must never be mistaken for a pass.

**Invariant:** *Mongo is the source of truth for the application; Sepolia is the source of truth for integrity.*

---

## Build sequence

| Phase | Work | Verified by | Needs wallet + internet? | Status |
|---|---|---|---|---|
| **0** | `.gitignore` block + `/lib/` fix; drop `web3` + `build-essential`; pin `httpx`; this file | backend builds smaller and boots clean | no | ✅ done |
| **1** | Contract + full Hardhat test suite | `npx hardhat test` green | **no** | ✅ done, 22/22 |
| **2** | Faucet → deploy to Sepolia → `hardhat verify` → `export:abi` → grant anchorer | a public Etherscan URL, source verified | yes | ⏳ **the only thing still blocked** — needs a Sepolia RPC URL + a funded throwaway wallet from the user. Everything it gates is already proven against the local chain. |
| **3** | `canonical.py` + tests | `pytest` green; golden vectors | **no** | ✅ done, 22/22 |
| **4** | Service with `ANCHOR_ENABLED=false` | `/health` alive-but-degraded; anchor → 202 + `pending` | **no** | ✅ done — `main.py` + compose wired, verified live: `/health` degraded, `/docs` 200, anchor → 202 `pending`, idempotent re-POST, `/verify` → `UNAVAILABLE` (not a false tamper finding) |
| **5** | Chain wiring: client, signer, gas, worker, reconcile, verify + `/onchain` | anchor → `confirmed` with a clickable tx | yes | ✅ done — runtime-verified against the local chain: `pending → submitted → confirmed`, real block numbers, 144,915 gas. Three latent bugs found and fixed (below). |
| **6** | Backend connector + `mine` builder + `anchor_mines.py` | end-to-end verify as the seeded regulator | yes | ✅ done — all three `/audit` routes verified with real seeded logins, incl. 403s for the wrong roles |
| **7** | `hardhat` compose profile; doc updates; `chain:*` scripts | full flow at `CHAIN_ID=31337`, no internet | no | 🔶 compose profile done and used for all of the above; **doc updates still outstanding** |

Phases 1, 3 and 4 need no wallet and no network — three people can work in parallel, and only one ever needs the funded wallet.

### Nothing here costs real money

**Total spend: ₹0.** Sepolia ETH is free faucet test currency with no market value. **Never fund this wallet with real ETH, and never reuse a personal MetaMask key** — the same private key controls the same address on mainnet.

Faucet: **Google Cloud Web3** (0.05 ETH/day, no mainnet-balance requirement) is the reliable one. **Claim a week before demo day, not the night before.** An `anchor()` is ~90–120k gas; one claim covers hundreds. Quote judges **~12–24s** for inclusion, not finality.

---

## Verification

**Contract** — `("ticket","a|b")` vs `("ticket|a","b")` produce different keys (the permanent `encodePacked` guard); re-anchor identical-to-latest reverts; `verify` with a wrong hash returns `found=false` and does **not** revert; 3 records with one anchored 3× → `mineRecordCount == 3` not 5; non-anchorer reverts; gas upper bound catches reintroduced string storage.

**Hashing** — the highest-value assertion, proving the millisecond trap is handled:
```python
assert canonical_bytes(**d) == canonical_bytes(**bson.decode(bson.encode(d)))
```
Plus golden vectors, key-order independence, `+05:30` == UTC, naive raises, `{"a": null}` ≠ `{}`, `{"a": true}` ≠ `{"a": 1}`, NFC, list order, envelope binding.

**End-to-end — the demo script.**
1. `anchor_mines.py` → entries go `pending → submitted → confirmed`, each with a clickable Etherscan tx.
2. As the seeded regulator, `POST /audit/verify/mine/<id>` → **`VERIFIED`**.
3. `mongosh` → edit that mine's `name` → verify again → **`TAMPERED`**.
4. Delete the mine → `GET /api/ledger/mines/<id>/onchain` still enumerates it from Sepolia alone.
5. Wipe `coalguard_ledger` entirely → step 4 still works. **The chain is the truth.**
