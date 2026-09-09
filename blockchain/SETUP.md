# Audit Ledger — Setup & Operations Guide

End-to-end guide to the `blockchain/` service: what it does, who touches it,
how to run it locally, and how to put it on a public testnet.

For the project-wide setup (backend, frontend, AI engine), see the root
[`SETUP.md`](../SETUP.md). This document is the deep version of its §8.

---

## Part 1 — How it works, and who sees what

### The one-sentence version

Nothing confidential ever goes on the blockchain — only a **SHA-256
fingerprint** of a record. Later, anyone can re-fingerprint whatever is in
MongoDB *right now* and compare it against the fingerprint frozen on-chain.
Same fingerprint → the record is untouched. Different → someone edited it.

> MongoDB is the source of truth for **the application**.
> The chain is the source of truth for **integrity**.

### Why this is worth doing

A regulator auditing a mine has no way to know whether a safety report was
quietly edited after an incident. Database backups don't help — whoever can
edit the record can usually edit the backup. Anchoring a hash on a public
chain means the mine operator cannot alter history without it being provable,
because they do not control the chain.

### The interface between users

There are five roles in the system. Only three of them interact with the
ledger at all, and each sees a different slice:

| Role | What they can do with the ledger | Endpoint |
|---|---|---|
| `worker` | Nothing. Never sees it. | — |
| `safety_officer` | Nothing directly. Their submitted records are what *gets* anchored. | — |
| `corporate_manager` | Nothing directly. Same — they are the audited party, not the auditor. | — |
| `regulator` | **Verify** any record, and read its anchor history. This is the point of the whole feature. | `POST /audit/verify/{type}/{id}`, `GET /audit/records/{type}/{id}` |
| `admin` | Everything a regulator can, plus **manually trigger** an anchor. | `POST /audit/anchor/{type}/{id}` |

Deliberate asymmetry: **the party being audited cannot anchor or verify.** A
corporate manager can edit a mine record, but they cannot re-anchor it to
cover their tracks — only an admin can anchor, and only a regulator's verify
decides whether the current data still matches.

### The one endpoint with no login at all

```
POST http://<ledger>/api/ledger/verify
```

This is open on purpose. An external auditor, a judge, or a journalist should
be able to check a record's integrity without an account in the system they
are auditing. A verification tool you have to be *inside* the system to run is
not much of a verification tool.

The write endpoints (`/api/ledger/anchor`) are protected by a shared secret
(`X-Ledger-Api-Key`) that only the backend knows.

### What actually goes on-chain

For a mine, exactly three fields — `name`, `lat`, `lng` — and only their hash.
No worker names, no health data, no photographs, nothing personal. The field
list is an explicit, versioned allowlist in
[`backend/src/services/audit_service.py`](../backend/src/services/audit_service.py),
so adding a new column to the `Mine` model later cannot silently invalidate
every anchor that already exists.

### The two flows

**Anchoring (write).** An admin triggers it, or the `anchor_mines` script does.
The backend picks the allowlisted fields and hands them to the ledger service
over HTTP. The ledger service hashes them, writes a `pending` row to its own
database, and **replies immediately**. A background worker picks it up a few
seconds later, signs a transaction, broadcasts it, and waits for the receipt.

```
record → allowlisted fields → SHA-256 → pending → submitted → confirmed
                                          └── background worker ──┘
```

Anchoring is **best-effort and never blocking**. If the chain is down, the
entry sits as `pending`, the app carries on completely normally, and the
backlog drains by itself when the chain returns. A blockchain outage must
never stop a safety officer from filing a report.

**Verifying (read).** A regulator asks to verify a record. The backend re-reads
it from MongoDB *as it exists at this moment*, rebuilds the same three fields,
and the ledger service re-hashes them and asks **the chain** — never its own
database — whether that hash was ever anchored.

Five possible answers, deliberately never collapsed into three:

| Verdict | Meaning |
|---|---|
| `VERIFIED` | Matches the most recent anchor. Untouched. |
| `STALE` | Matches an *older* anchor. Changed legitimately, but never re-anchored. |
| `TAMPERED` | Anchored before, but today's data matches nothing. **Someone edited it.** |
| `NOT_ANCHORED` | Never anchored. Proof of nothing either way. |
| `UNAVAILABLE` | Couldn't reach the chain. **Not an accusation.** |

`UNAVAILABLE` exists specifically so a network timeout can never be reported
as tampering. Falsely accusing an operator because an RPC call was slow would
be worse than having no tool at all.

### Every version is kept

Anchoring the same record five times stores five fingerprints in order. That
proves the record's whole *history*, not just its present state — which is why
`STALE` ("changed, but honestly") is a separate answer from `TAMPERED`
("changed, and it doesn't match anything we ever saw").

### The chain alone can rebuild everything

The contract emits each record's plaintext type and ID in its event logs. So
`GET /api/ledger/mines/{mine_id}/onchain` can reconstruct every record ever
anchored for a mine using **nothing but the contract address** — even if you
delete the MongoDB record *and* wipe this service's own database. That is the
demonstration that makes the point: the ledger service's database is a cache,
not the trust anchor.

---

## Part 2 — What's in this folder

| Path | What it is |
|---|---|
| `contracts/AuditLedger.sol` | The smart contract. Stores hashes, emits events, enforces roles. |
| `src/` | The Python/FastAPI runtime service. This is what runs in Docker. |
| `src/canonical.py` | Turns a payload into bytes one fixed way, then hashes it. |
| `src/worker.py` | The background loop; the only thing that writes to the chain. |
| `src/services/verify_service.py` | The tamper check. Reads the chain, never the local DB. |
| `scripts/` | Hardhat scripts: deploy, grant role, export ABI, new wallet. |
| `test/AuditLedger.test.js` | 22 Solidity tests. |
| `tests/test_canonical.py` | 22 hashing tests. |
| `deployments/<network>.json` | Written by the deploy script. The service reads this. |
| `abi/AuditLedger.json` | The contract interface the Python service uses. |

**Node is only needed to compile, test and deploy the contract.** The service
itself is Python. You do not need Node installed — every `chain:*` command
runs Hardhat inside a pinned `node:20` container.

---

## Part 3 — Run it locally (no internet, no faucet, no account)

This is the path for development and dry runs. The chain is an offline
Hardhat node in Docker, chain ID `31337`.

### Step 1 — Create the env file

```bash
cp blockchain/.env.example blockchain/.env
```

### Step 2 — Start the stack and the chain

```bash
npm run dev:up        # backend, mongo, redis, chroma, blockchain
npm run chain:node    # the local chain (compose profile "chain")
```

### Step 3 — Deploy the contract

```bash
npm run chain:deploy:localhost
```

This writes `deployments/localhost.json` automatically. You do not need to
copy the address anywhere.

### Step 4 — Fill in `blockchain/.env`

```bash
ANCHOR_ENABLED=true
CHAIN_RPC_URL=http://hardhat:8545
CHAIN_ID=31337
CONTRACT_ADDRESS=
CONFIRMATIONS_REQUIRED=0
ANCHOR_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

What each line is doing:

| Setting | Why |
|---|---|
| `CHAIN_RPC_URL=http://hardhat:8545` | The Docker service name, **not** `localhost`. Containers reach each other by name. |
| `CONTRACT_ADDRESS=` | **Leave empty.** Empty means "read `deployments/localhost.json`", which the deploy script keeps current. Hand-typing an address here is the #1 cause of a stale, broken setup. |
| `CONFIRMATIONS_REQUIRED=0` | Hardhat only mines a block when a transaction arrives. With any higher value, the last anchor of a burst waits forever for a block that will never be produced. |
| `ANCHOR_PRIVATE_KEY=0xac09…ff80` | Hardhat's built-in account #0. It is the deployer, so `deploy.js` already granted it `ANCHORER_ROLE`, and it starts with 10000 test ETH. **Publicly known and worthless — local chain only, never anywhere real.** |

Also confirm `LEDGER_API_KEY` here is the **exact same string** as
`LEDGER_API_KEY` in `backend/.env`. If they differ, the backend gets rejected.

### Step 5 — Restart the service

```bash
docker compose up -d blockchain
```

> ⚠️ **Use `up -d`, not `restart`.** `docker compose restart` does **not**
> re-read `env_file`. Your `.env` changes will be silently ignored and
> nothing will work, with no error explaining why.

### Step 6 — Check health

```bash
curl -s 127.0.0.1:8003/health | python3 -m json.tool
```

Every module must read `"ready": true`. The two that catch real problems:

- `signer.has_anchorer_role: false` → the anchor key isn't allowed to anchor.
- `rpc.chain_id` ≠ `expected_chain_id` → `.env` points at the wrong chain.

### Step 7 — Anchor some records

```bash
docker compose exec backend python -m scripts.anchor_mines
curl 127.0.0.1:8003/api/ledger/stats
```

Watch the counts move `pending` → `submitted` → `confirmed`.

---

## Part 4 — Deploy to Sepolia (a public, clickable transaction)

Use this for the real demo. Every anchor becomes a link on
`sepolia.etherscan.io` that anyone can open.

```bash
# 1. Generate a throwaway wallet — NEVER a personal MetaMask key
npm run chain:new-wallet

# 2. Fund the printed address:
#    https://cloud.google.com/application/web3/faucet/ethereum/sepolia
#    Faucets ration per 24h — claim it the DAY BEFORE a demo, not the morning of.
#    One claim covers hundreds of anchors (~90–120k gas each).

# 3. Put DEPLOYER_PRIVATE_KEY in blockchain/.env, then:
npm run chain:deploy:sepolia
npm run chain:export-abi

# 4. Publish the source so anyone can call verify() from a browser
npm run chain:verify -- <address> <deployer> <anchorer>
```

Then switch `blockchain/.env` to:

```bash
ANCHOR_ENABLED=true
CHAIN_RPC_URL=<your Sepolia RPC URL>
CHAIN_ID=11155111
CONTRACT_ADDRESS=
CONFIRMATIONS_REQUIRED=1
ANCHOR_PRIVATE_KEY=<the funded throwaway key>
```

`CONFIRMATIONS_REQUIRED=1` because Sepolia mines every ~12s regardless of
traffic and does have reorgs, unlike the local chain.

```bash
docker compose up -d blockchain
```

> 💰 **This is testnet ETH with no market value. Never fund this wallet with
> real ETH.** The same private key controls the same address on mainnet, which
> is exactly why it must be a fresh throwaway and never a personal wallet.

### Two keys, on purpose

| Key | Role | Used by |
|---|---|---|
| `DEPLOYER_PRIVATE_KEY` | Contract admin. Can grant/revoke roles. | Hardhat, at deploy time only |
| `ANCHOR_PRIVATE_KEY` | Hot wallet. Can only submit anchors. | The running Python service |

They can be the same wallet to start — leave `ANCHORER_ADDRESS` blank and the
deploy grants the anchor role to the deployer. Splitting them later is then a
config change rather than a redeploy.

---

## Part 5 — Testing

### Offline tests (no chain, no wallet, no internet)

```bash
npm run chain:test      # 22 Solidity tests
npm run chain:pytest    # 22 canonical-hashing tests
```

Neither needs any service running. This is what every teammate can run.

### The tamper demonstration

Open **http://127.0.0.1:8003/docs** — a clickable Swagger UI, no login needed.

1. `POST /api/ledger/verify` with a mine's details → **`VERIFIED`**.
2. Now edit the record behind the system's back:
   ```bash
   docker compose exec mongodb mongosh
   use coalguard
   db.mines.updateOne({_id: ObjectId("<mine_id>")}, {$set: {name: "Hacked"}})
   ```
3. Run the same call again → **`TAMPERED`**, with a different hash.
4. Delete the mine entirely, then
   `GET /api/ledger/records/mine/<id>/onchain` → its full history is still
   there, read straight off the chain.
5. Drop this service's own `coalguard_ledger` database too → step 4 **still
   works**.

Also worth showing: stop the chain (`docker compose stop hardhat`) and verify
again. You get `UNAVAILABLE`, never a false `TAMPERED`.

### Checking from the running frontend

There is currently **no blockchain UI in the frontend** — no button, no badge.
Verification is done through Swagger, or from the browser console on a logged-in
page (the ledger service sets `allow_origins=["*"]`, so this works):

```js
const token = JSON.parse(localStorage.getItem('coalguard-auth')).state.token;
const auth  = { Authorization: `Bearer ${token}` };

const mines = await (await fetch('http://localhost:8000/mines', { headers: auth })).json();
const id = mines[0].id ?? mines[0]._id;

const res = await fetch(`http://localhost:8000/audit/verify/mine/${id}`, {
  method: 'POST', headers: auth,
});
console.table(await res.json());
```

Log in as `regulator@example.com` / `test123` first.

---

## Part 6 — Operating it

### Shutting down

```bash
npm run dev:down                    # leaves the chain node RUNNING
docker compose --profile chain down # stops everything, including the chain
```

`npm run dev:down` prints `Network sih26_default: Resource is still in use`.
That is expected, not an error: the `hardhat` service sits behind a compose
profile, so plain `down` doesn't touch it, and the network can't be removed
while it's attached.

**This is protective.** The local chain keeps its entire state **in memory
only** — no volume, no persistence. Killing it resets the chain to block 0,
which destroys the deployed contract and makes every `confirmed` anchor point
at an address with no code at it. Leaving it up means you can cycle the app
stack freely without losing your chain.

If you do kill it, recovery is always these three commands:

```bash
npm run chain:node
npm run chain:deploy:localhost
docker compose exec backend python -m scripts.anchor_mines
```

### Failure modes and what they look like

| Symptom | Cause | Fix |
|---|---|---|
| Entries stuck at `pending` | `ANCHOR_ENABLED=false`, or the signer has no funds | Check `/health` → `signer` |
| Entries stuck at `submitted` | `CONFIRMATIONS_REQUIRED` > 0 on the local chain | Set it to `0` |
| Entry `failed`, "does not hold ANCHORER_ROLE" | Redeployed without granting the role | `npm run chain:grant-anchorer` |
| `contract.ready: false` | `.env` address doesn't match the live chain | Blank `CONTRACT_ADDRESS`, `docker compose up -d blockchain` |
| Everything reads `NOT_ANCHORED` | The chain was restarted and reset | Redeploy + re-anchor (above) |
| `.env` edits appear ignored | You used `docker compose restart` | Use `docker compose up -d blockchain` |

A `failed` entry can be requeued rather than re-anchored from scratch:

```
POST /api/ledger/entries/{entry_id}/retry
```

### Designed degradations (not bugs)

- **Chain unreachable** → entries stay `pending`, the app is unaffected, the
  backlog drains automatically on recovery.
- **Wallet out of test ETH** → nothing is marked failed; entries are left
  exactly as they are so a faucet top-up drains them with no intervention.
- **Transaction stuck** → after a timeout the worker checks whether the nonce
  was actually consumed before re-sending, so it can never double-broadcast.

### Reference

| Thing | Where |
|---|---|
| Ledger service | `127.0.0.1:8003` — `/health`, `/docs`, `/api/ledger/stats` |
| Backend audit routes | `127.0.0.1:8000/audit/…` (regulator or admin) |
| Local chain RPC | `127.0.0.1:8545` from the host, `http://hardhat:8545` from containers |
| MongoDB | `127.0.0.1:27018` |
| Demo logins | `regulator@example.com`, `admin@example.com` — password `test123` |
