# AI Engine — Docker venv + Shell Access for Training

> **Last updated:** 2026-09-02 (uncommitted — not yet pushed, exists only in this local working tree) · 
**Status:** PLAN — awaiting your review before any code changes

Goal: `ai_engine`'s Docker container should use a proper virtualenv internally (not the image's system Python), and there should be one documented command to open an interactive shell inside the running container so someone can run `ingest_rag.py` / `train_cv.py` directly, instead of setting up a local per-OS venv on their own machine.

---

## Current state (confirmed by reading the files)

- `ai_engine/Dockerfile` installs everything with plain `pip install` straight into the image's system Python — no venv exists inside the container at all today. Base image is `python:3.10-slim`, while `backend/Dockerfile` uses `python:3.12-slim` — the two services are on different Python versions.
- Shared package versions are already mostly aligned: `fastapi==0.111.0`, `uvicorn==0.30.1` (`ai_engine` adds the `[standard]` extra, a superset — not a version conflict), and `python-multipart==0.0.9` are identical in both `requirements.txt` files. No action needed there beyond the Python version bump.
- `backend` and `ai_engine` are two independent Docker services/images (confirmed in `docker-compose.yml`), each with its own container and filesystem — so they've always had, and will continue to have, two separate venvs. That's inherent to the microservice split (ai_engine's heavy ML stack — torch, ultralytics, langchain, chromadb — stays isolated from the lean backend), not something this plan changes.
- `ai_engine/src/main.py` is itself a standalone FastAPI HTTP server (own port `8001:8000`, endpoints like `/api/cv/detect`, `/api/rag/check-compliance`) that `backend` calls over HTTP — FastAPI/uvicorn are load-bearing there, not incidental.
- `npm run dev:up:all` is already `docker compose up -d --build` — it rebuilds every service on every run, ai_engine included. So once the Dockerfile changes below land, the very next `npm run dev:up:all` picks them up automatically; no new command or container is needed.
- `ai_engine/AI_ENGINE_GUIDE.md` and `ai_engine/AI_ENGINE_DOCS.md` both document a **local, per-OS** workflow instead: `python -m venv .venv` → `.\.venv\Scripts\Activate.ps1` (Windows PowerShell) → `python ingest_rag.py` / `python train_cv.py --epochs 50 --batch 16`, run on the host machine, not in Docker.
- `docker-compose.yml`'s `ai_engine` service only bind-mounts `src/` and `data/` — `train_cv.py` and `ingest_rag.py` (at the package root) are baked into the image via `COPY . .` and only update on a rebuild.
- There's a **local** `ai_engine/.venv/` sitting in the repo (gitignored, untracked) — a leftover from someone's local setup. Unrelated to Docker; not touched by this plan.
- No `ai_engine/.env.example` exists (backend has one; ai_engine doesn't). Noting this as a gap — out of scope for this plan unless you want it added too.

---

## Proposed changes

### 1. `ai_engine/Dockerfile` — align to Python 3.12 and create a real venv inside the image

Bump the base image to `python:3.12-slim` (matching `backend/Dockerfile`), add a venv at `/opt/venv` (kept outside `/app` on purpose — see note below), install all dependencies into it, and put it first on `PATH` so it's active automatically for the `CMD` process *and* for anyone who execs into the container (no manual `source .venv/bin/activate` needed):

```dockerfile
FROM python:3.12-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Create the venv Docker will use, and make it the default `python`/`pip` on PATH
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

WORKDIR /app

RUN pip install --no-cache-dir --upgrade pip setuptools wheel

COPY requirements.txt .
RUN pip install --no-cache-dir torch==2.3.0 torchvision==0.18.0 --extra-index-url https://download.pytorch.org/whl/cpu \
    && pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Why `/opt/venv` and not `/app/.venv`**: `/app` is where `src/` and `data/` get bind-mounted over at runtime. If the venv lived inside `/app`, a future "mount the whole ai_engine folder" change could shadow it. Putting it at `/opt/venv` keeps the venv and the bind-mounted app code fully independent — this also sidesteps any confusion with the unrelated local `ai_engine/.venv/` mentioned above, which lives only on the host.

**Risk on the 3.12 bump**: `torch==2.3.0`/`torchvision==0.18.0`, `chromadb==0.5.0` (native hnswlib build), and `ultralytics==8.2.15` all have compiled/native pieces. I expect all of them to have Python 3.12 wheels (torch added official 3.12 support before this version), but the real test is `docker compose build ai_engine` actually succeeding — a missing wheel fails loudly at build time (pip either finds a wheel or tries to compile from source and errors), it won't silently produce a broken image. If that happens, the fallback is staying on `python:3.11-slim` (still newer than today's 3.10, still likely has every wheel) rather than reverting all the way back to 3.10.

Functionally this doesn't change what's installed or how the server starts — the venv is transparent to `CMD`. What it changes: `docker compose exec ai_engine pip list` / `python ...` now clearly runs against an isolated venv instead of the image's system Python, matching what "using the docker venv" means, and it's the same interpreter someone gets when they open a shell (next section) — nothing extra to activate.

### 2. A documented command to open a shell in the running container

Once the `ai_engine` container is up (`npm run dev:up` or `docker compose up -d ai_engine`), running:

```
docker compose exec ai_engine bash
```

drops into an interactive shell inside the container, with `/opt/venv` already active on `PATH`. From there, someone can run the exact commands the docs already describe, just inside the container instead of a local venv:

```
python ingest_rag.py
python train_cv.py --epochs 50 --batch 16
```

I'll add this as a root `package.json` script for discoverability, matching the existing `dev:*` naming:

```json
"ai:shell": "docker compose exec ai_engine bash"
```

(`python:3.10-slim` is Debian-based and ships `bash` by default, so no Dockerfile change is needed to support this.)

### 3. Open decision — bind-mount `train_cv.py` / `ingest_rag.py`?

Explained above (frozen-copy-vs-live-link). Two options, your call:

- **Mount them** (add to `docker-compose.yml`'s `ai_engine.volumes`, same pattern as `backend/scripts`): edit locally, rerun in the shell immediately, no rebuild. Slightly more entries in `docker-compose.yml`.
- **Leave them baked in**: simpler compose file; anyone tweaking training params has to `docker compose build ai_engine` after editing before rerunning, or the shell will silently run the stale version.

My default recommendation is to mount them (consistency with `backend/scripts`, and training scripts get edited/tuned often), but flagging it rather than deciding for you.

---

## What this plan does *not* touch

- The unrelated local `ai_engine/.venv/` — left alone.
- `ai_engine/requirements.txt` — no version/package changes.
- The actual model/RAG code (`src/cv_engine.py`, `src/rag_engine.py`, `src/predictive_engine.py`) — untouched.
- `AI_ENGINE_GUIDE.md` / `AI_ENGINE_DOCS.md` — per your instruction, docs get updated only after these changes are made and verified, not now.

---

## Sequence

1. You review this plan and answer the open decision above (and anything else you want changed).
2. I make the Dockerfile + `docker-compose.yml` + `package.json` changes.
3. Rebuild (`docker compose build ai_engine`) and verify: container starts, `docker compose exec ai_engine which python` resolves to `/opt/venv/bin/python`, `npm run ai:shell` drops into a working shell, and (if you want) a quick `ingest_rag.py` or `train_cv.py` dry run works from inside it.
4. You verify.
5. I update `AI_ENGINE_GUIDE.md` and `AI_ENGINE_DOCS.md` to describe the new Docker-shell workflow.
