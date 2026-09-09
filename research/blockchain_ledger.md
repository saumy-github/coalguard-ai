# Cryptographic Audit Ledger (Blockchain)

> **Last updated:** 2026-09-08 (uncommitted — not yet pushed, exists only in this local working tree) · 
**Status:** CURRENT — describes the `blockchain/` service as built. Supersedes this file's previous `logReport`/`resolveReport` design, which was never implemented. Build plan and rationale: `BLOCKCHAIN_PLAN.md` at the repo root.

CoalGuard stores every compliance violation in MongoDB, and MongoDB is mutable. Anyone with database credentials can run `db.site_issues.deleteOne({...})` the night before a DGMS audit, and the violation simply never existed. The entire compliance system is only as trustworthy as its database administrator.

The fix: SHA-256 each record and anchor **only that 32-byte fingerprint** on a public blockchain. A regulator re-hashes whatever is in MongoDB now and compares against the chain. A mismatch, or an absence, proves tampering. Nothing confidential ever leaves the system — a hash reveals nothing about its input.

**The invariant everything follows from:** *MongoDB is the source of truth for the application; the chain is the source of truth for integrity.*

---

## 1. Shape

A **separate microservice**, not code inside `backend/`. The backend never hashes anything and never talks to Ethereum — it sends the ledger service a record type and id, and the service does the rest.

That separation is the point. The claim being made is "a DBA cannot silently edit Mongo", and the backend is exactly what a DBA controls. A hash the backend computes, and a verification the backend performs, would only prove the backend agrees with itself.

```text
blockchain/
├── contracts/AuditLedger.sol      # the contract
├── test/AuditLedger.test.js       # 22 Hardhat tests
├── scripts/                       # deploy, grant-anchorer, export-abi, anchor-demo
├── abi/AuditLedger.json           # committed — the runtime image needs no Node
├── deployments/<network>.json     # committed — address + deployedAtBlock
├── tests/test_canonical.py        # 22 hashing tests
└── src/
    ├── canonical.py               # the hashing contract, frozen
    ├── worker.py                  # the submit/confirm queue runner
    ├── chain/                     # client, signer, gas, deployment resolution
    ├── services/                  # ledger, verify, onchain
    └── routes/ledger.py
```

FastAPI + web3.py + Beanie, against its own `coalguard_ledger` database. Python, not Node, so it matches `backend/` and `ai_engine/` — the runtime image carries no Node at all, because the ABI and the deployed address are committed files.

---

## 2. The contract — `AuditLedger.sol`

Solidity 0.8.24, OpenZeppelin `AccessControl`, deployed to **Ethereum Sepolia** (chain 11155111). A local Hardhat node (31337) runs the identical code path offline.

Generic by design — `{recordType, recordId, mineId, payloadHash}` anchors *any* record type, so adding one later is not a redeploy.

```solidity
struct Anchor {          // two storage slots
    bytes32 payloadHash;
    uint64  anchoredAt;
    address anchoredBy;
    uint32  version;
}
mapping(bytes32 => Anchor[])  private _anchors;      // recordKey => every anchor, oldest first
mapping(bytes32 => bytes32[]) private _mineRecords;  // mineKey  => distinct recordKeys
```

Anchors **append**, they never overwrite. A record legitimately changes over its life, and the chain should show that history rather than pretend the latest state was always the state.

Key decisions:

- **`keccak256(abi.encode(...))`, never `abi.encodePacked`.** Packed encoding of two dynamic strings is ambiguous: `("ticket", "a|b")` and `("ticket|a", "b")` would collide, letting one record forge another's identity. There is a permanent test for exactly this.
- **Re-anchoring the current latest reverts** (`AlreadyAnchored`), but re-anchoring an *older* hash is allowed — a record may legitimately cycle back to a previous state.
- **`verify()` returns `found=false` rather than reverting** on a wrong hash. A revert is indistinguishable from an RPC failure at the call site, and that distinction is the whole product.
- **Storage as well as events.** Event-only anchoring is cheaper, but verification would then need an `eth_getLogs` range scan, which free-tier RPCs cap and pruned nodes refuse. A regulator's verify returning "cannot determine" for infrastructure reasons is the worst available failure.
- **`viaIR: true`** in the Hardhat config — the `RecordAnchored` event carries four strings and does not otherwise fit on the stack.
- **`ANCHORER_ROLE`** on the hot wallet, `DEFAULT_ADMIN_ROLE` on the deploy key, so a compromised hot key can be revoked without redeploying.

The event carries the plaintext `recordType`/`recordId`/`mineId` that storage only keeps as hashes — it *is* the off-chain index, which is what makes a deleted record still enumerable.

---

## 3. Canonical hashing — frozen on first deploy

**The seam: the backend owns *which* fields (the projection); the service owns *how* bytes are made (the encoding).**

Projections are **include-lists, never exclude-lists** — an exclude-list fails open, so any future field would silently join the digest and invalidate every existing anchor. `backend/src/services/audit_service.py` holds them, versioned and append-only.

The payload is wrapped in a versioned envelope before hashing (domain separation): without it, an anchor proving record A could be replayed as proof for record B.

Encoding rules in `canonical.py`, each guarding a specific failure:

| Rule | Why |
|---|---|
| `bool` dispatched **before** `int` | `isinstance(True, int)` is `True` in Python |
| `float` **raises** | quantise upstream; float formatting is not stable enough to hash |
| `datetime` truncated to **milliseconds** | BSON stores ms, Python holds µs — the likeliest silent killer |
| naive `datetime` **raises** | an implicit timezone is an implicit hash change |
| `str` NFC-normalised | two byte-sequences for the same glyph must hash alike |
| `None` kept, not dropped | `{"a": null}` and `{}` are different claims |
| list order preserved | order is data |
| anything unrecognised **raises** | never silently `str(x)` a type nobody considered |

The highest-value test asserts a payload survives a BSON round-trip unchanged:

```python
assert canonical_bytes(**d) == canonical_bytes(**bson.decode(bson.encode(d)))
```

Writing that test surfaced a genuine production requirement before any service code existed: the Motor client **must** be constructed with `tz_aware=True`, or datetimes come back naive and every hash silently changes. That is now baked into `src/db.py`.

---

## 4. Anchoring is asynchronous

Sepolia takes ~12s per block and can fail. A compliance write must never wait on it, and must never fail because of it.

**The queue is a Mongo collection, not an in-process `asyncio.Queue`** — an in-memory queue drops unanchored records on restart, which is precisely the failure this feature exists to prevent.

Four statuses: `pending → submitted → confirmed | failed`. Three cannot distinguish "not sent yet" from "sent, awaiting receipt", so a restart would re-broadcast in-flight transactions and double-anchor.

The worker:

- Persists `tx_hash` and `nonce` **before** broadcasting. A crash the other way round leaves an in-flight transaction the service has no record of.
- Runs a free `.call()` pre-flight, which catches `AlreadyAnchored` and a revoked role before spending anything.
- Treats a receipt timeout as **not** a failure — it re-sends only once the nonce is provably consumed and there is still no receipt.
- Wraps every chain call in `asyncio.to_thread(...)`: web3.py 6 is synchronous, and a blocking `wait_for_transaction_receipt` would freeze the whole app including `/health`.
- Uses EIP-1559 fees, never legacy `gasPrice`.
- **Degrades deliberately when out of test ETH:** entries stay `pending`, `attempts` is *not* incremented, `/health` reports degraded, and the backlog drains itself on refill.

---

## 5. Verification returns five verdicts

| Verdict | Meaning |
|---|---|
| `VERIFIED` | current data matches the latest anchor |
| `STALE` | matches an *older* anchor — the record changed and was re-anchored |
| `TAMPERED` | anchors exist, but this hash is not among them |
| `NOT_ANCHORED` | never anchored; absence of proof, not proof of tampering |
| `UNAVAILABLE` | the chain could not be reached |

These are never collapsed. A tool that reports `TAMPERED` because an RPC timed out is worse than useless — it turns an infrastructure hiccup into a false accusation against a named operator. `UNAVAILABLE` exists so that can never happen.

The two `/onchain` endpoints read the chain **with no database access at all**. Delete the record from Mongo, wipe the ledger service's own database, and they still reconstruct a mine's full anchor history from the contract and `eth_getLogs` alone. That is the demonstration the feature is for: a deletion leaves permanent, public evidence that it happened.

---

## 6. Backend connector

`backend/src/services/audit_service.py`, deliberately asymmetric:

- **`anchor_record` swallows every failure** and returns a status dict. Callers never need `try/except`, so a compliance write can never fail because the ledger is down.
- **`verify_record` raises.** A verify with no answer must never be mistaken for a pass.
- A missing record raises `RecordNotFound` → **404**, kept distinct from an unreachable ledger → **502**. "This mine is gone" and "try again in a minute" demand opposite reactions.

Routes (`backend/src/routes/audit.py`):

| Route | Access |
|---|---|
| `POST /audit/verify/{record_type}/{record_id}` | `regulator`, `admin` |
| `GET /audit/records/{record_type}/{record_id}` | `regulator`, `admin` |
| `POST /audit/anchor/{record_type}/{record_id}` | `admin` |

`backend/scripts/anchor_mines.py` anchors every mine in one go. It is **not** wired into `scripts/index.py` — a network call in the seed orchestrator would make `npm run dev:seed` fail whenever the chain is down.

---

## 7. Security

1. A **fresh throwaway wallet, never a personal MetaMask key** — the same private key controls the same address on every EVM chain, and a reused key in a screen-share is the classic incident.
2. `SecretStr` for the key; the settings object is never logged.
3. Shared-secret header on the write endpoints, compared with `secrets.compare_digest`.
4. Bound to **`127.0.0.1:8003`** — the service has no browser client, so loopback-binding removes denial-of-wallet from the LAN entirely.
5. Sepolia ETH is free faucet currency with no market value. **Never fund this wallet with real ETH.**

---

## 8. Running it

Setup, both the offline and the Sepolia path: **`SETUP.md` §8**. Design rationale and the full build log: **`BLOCKCHAIN_PLAN.md`**.

```bash
npm run chain:test     # 22 contract tests — no chain, no wallet, no internet
npm run chain:pytest   # 22 canonical-hashing tests
npm run chain:node     # local Hardhat chain for the full offline flow
```
