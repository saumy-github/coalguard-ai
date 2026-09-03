# Developer Setup Guide

> **Last updated:** 2026-09-03 (uncommitted — not yet pushed, exists only in this local working tree) · 
**Status:** CURRENT

Gets your local environment running. Read once, then use as reference.

## Project layout

- `frontend/` — Vite + React + TypeScript + Tailwind. Deployed independently on Vercel; not part of Docker.
- `backend/` — Python/FastAPI, runs in Docker.
- `ai_engine/` — Python/FastAPI (ML), runs in Docker. See `ai_engine/README.md` for details specific to that service.
- `blockchain/` — contracts (early scaffolding).
- `research/` — planning docs, not code.

You do **not** need Python installed locally — `backend` and `ai_engine` only run inside Docker.

---

## 1. Prerequisites

You need **Git**, **Node.js** (v18+, LTS recommended), and **Docker**.

### Windows

1. **WSL2** — open PowerShell as Administrator:
   ```powershell
   wsl --install
   ```
   Restart when prompted. Details: https://learn.microsoft.com/en-us/windows/wsl/install
2. **Git** — https://git-scm.com/downloads, or `sudo apt install git` inside WSL.
3. **Node.js** — install inside WSL (https://nodejs.org/en/download or `nvm`) so it matches the Linux instructions below.
4. **Docker Desktop** — https://www.docker.com/products/docker-desktop/. In Settings → General, make sure **"Use the WSL 2 based engine"** is enabled.

Do everything else in this guide (cloning, `npm`, `docker compose`) from inside your WSL terminal, not PowerShell/cmd. Also clone the repo **inside the WSL filesystem** (e.g. `~/code/...`), not under `/mnt/c/...` — otherwise the bind-mounted volumes used for hot-reload are slow.

### macOS

1. **Git** — included with Xcode Command Line Tools (`xcode-select --install` if missing).
2. **Node.js** — LTS installer from https://nodejs.org/en/download.
3. **Docker Desktop** — https://www.docker.com/products/docker-desktop/ (pick Apple Silicon or Intel build).

### Linux

1. **Git** — usually preinstalled; otherwise your distro's package manager.
2. **Node.js** — LTS via https://nodejs.org/en/download or `nvm`.
3. **Docker Engine + Compose plugin** — https://docs.docker.com/engine/install/.

### Verify

```bash
git --version
node --version
npm --version
docker --version
docker compose version
```

All should print a version, not "command not found".

---

## 2. Clone the repo

```bash
git clone https://github.com/saumy-github/sih26.git
cd sih26
```

There's no team branch workflow finalized yet — for now, coordinate directly before pushing to `main`.

---

## 3. Config files

Three files, none committed (see `.gitignore`) — copy each `.env.example` to `.env` in the same folder and adjust as needed.

### `backend/.env`

```
MONGODB_URI=mongodb://mongodb:27017
MONGODB_DB_NAME=coalguard
FRONTEND_URL=http://localhost:5173

JWT_SECRET_KEY=change-me-to-a-long-random-string
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=5256000
GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
```

Change `JWT_SECRET_KEY` to a real random string even for local dev — it signs every login session, and sessions are deliberately long-lived (~10 years, no refresh-token rotation — see the comment in `backend/.env.example`). `GOOGLE_CLIENT_ID` can stay as the placeholder: Google sign-in is currently disabled in the frontend UI (see `research/saumy/02-google-auth-deferred.md`), so nothing depends on it yet.

### `frontend/.env`

```
VITE_API_URL=http://localhost:8000
VITE_GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
```

Same note on `VITE_GOOGLE_CLIENT_ID` — safe to leave as the placeholder for now.

### `ai_engine/.env`

```
GROQ_API_KEY=gsk_your_actual_groq_api_key_here
GROQ_MODEL=openai/gpt-oss-120b
```

`GROQ_API_KEY` is required for the RAG compliance endpoint (`/api/rag/check-compliance`) — get a free one at [console.groq.com/keys](https://console.groq.com/keys). Everything else in `ai_engine` (PPE detection, anomaly detection, forecasting) works without it.

---

## 4. Start backend + datastores (Docker)

```bash
npm run dev:up
```

This builds and starts `backend`, `mongodb`, `redis`, and `chromadb` in the background.

- Backend: http://localhost:8000
- MongoDB: `mongodb://localhost:27018`
- Redis: `localhost:6380`
- ChromaDB: http://localhost:8002

To also start the ML service (`ai_engine`, heavier build — pulls PyTorch):

```bash
npm run dev:up:all
```
- AI Engine: http://localhost:8001

Stop everything:
```bash
npm run dev:down
```

Backend and ai_engine both hot-reload on code changes (their `./src` folders are bind-mounted) — no rebuild needed for normal edits.

---

## 5. Seed the database (first time only)

There's no sign-up flow — an Admin has to create every account, and the very first account has to come from somewhere. Once `backend` is up (step 4):

```bash
npm run dev:seed
```

This creates 5 test accounts, all with password `test123`:

| Identifier | Role |
|---|---|
| `+919990000001` (phone) | Worker |
| `officer@example.com` | Mine Safety Officer |
| `corporate@example.com` | Corporate Management |
| `regulator@example.com` | Regulatory Authority |
| `admin@example.com` | Admin |

It's idempotent — safe to run again, it skips accounts that already exist. Skip this step and nobody can log in at all.

---

## 6. Start the frontend

In a second terminal:
```bash
cd frontend
npm ci
npm run dev
```

Open http://localhost:5173, and log in with one of the seeded accounts above.

---

## 7. Daily workflow

Two terminal tabs:

```bash
npm run dev:up               # terminal 1 — or dev:up:all if you need ai_engine that session
cd frontend && npm run dev   # terminal 2
```

Stop with `npm run dev:down` when done. Seeding (step 5) is one-time — the accounts persist in the `mongo_dev_data` Docker volume across restarts, you don't need to reseed unless you wipe that volume.

---

## 8. Useful commands

- View backend logs: `docker compose logs -f backend`
- View ai_engine logs: `docker compose logs -f ai_engine`
- Open a MongoDB shell: `docker compose exec mongodb mongosh`
- Open a Redis shell: `docker compose exec redis redis-cli`
- Open a shell in the ai_engine container (for training/ingestion — see `ai_engine/README.md`): `docker compose exec ai_engine bash`
- Save uncommitted changes before switching branches: `git stash -u`, then `git stash pop` to restore.

---

## Troubleshooting

**First `npm run dev:up` (or `dev:up:all`) feels slow.**
Normal — it's building images and downloading dependencies for the first time (ai_engine in particular pulls PyTorch and compiles a couple of packages from source). Every run after that reuses the Docker build cache and is fast.

**`ai_engine` doesn't need a GPU, right?**
Correct — it installs the CPU-only build of PyTorch. It'll run fine on any laptop; model inference is just slower than it would be on a GPU.

**Ports already in use.**
All datastore ports are remapped off their defaults specifically to avoid clashing with a locally installed Mongo/Redis (`27018`, `6380`, `8002` instead of the standard `27017`, `6379`, `8000`). If you still get a conflict, check what else is bound to that port with `lsof -i :<port>` (macOS/Linux) before assuming it's this project.

**`dev:up` fails after pulling new changes.**
Someone likely added a new dependency to `requirements.txt`. Just run `npm run dev:up` (or `dev:up:all`) again — it rebuilds automatically.

**I can't log in / there are no users.**
Run `npm run dev:seed` (step 5) — it's easy to miss since it's not part of `dev:up`.

**I edited a `Dockerfile` but the running container doesn't seem to have changed.**
`docker compose up -d --build` rebuilds the *image* but doesn't always recreate an already-running *container* from it. Force it: `docker compose up -d --force-recreate <service>` (e.g. `ai_engine`).
