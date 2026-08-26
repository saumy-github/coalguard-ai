# Developer Setup Guide

Gets your local environment running. Read once, then use as reference.

## Project layout

- `frontend/` — Vite + React + TypeScript + Tailwind. Deployed independently on Vercel; not part of Docker.
- `backend/` — Python/FastAPI, runs in Docker.
- `ai_engine/` — Python/FastAPI (ML), runs in Docker.
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

Two files, neither committed (see `.gitignore`) — copy the example and adjust if needed.

### `backend/.env`

The example values already work as-is for Docker:

```
MONGODB_URI=mongodb://mongodb:27017
MONGODB_DB_NAME=coalguard
FRONTEND_URL=http://localhost:5173
```

### `frontend/.env`

```
VITE_API_URL=http://localhost:8000
```

Nothing in `ai_engine` reads environment variables yet — this section will grow once that changes.

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

## 5. Start the frontend

In a second terminal:
```bash
cd frontend
npm ci
npm run dev
```

Open http://localhost:5173.

---

## 6. Daily workflow

```bash
npm run dev:up               # terminal 1 (or dev:up:all if you need ai_engine)
cd frontend && npm run dev   # terminal 2
```

Stop with `npm run dev:down` when done.

---

## 7. Useful commands

- View backend logs: `docker compose logs -f backend`
- View ai_engine logs: `docker compose logs -f ai_engine`
- Open a MongoDB shell: `docker compose exec mongodb mongosh`
- Open a Redis shell: `docker compose exec redis redis-cli`
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
