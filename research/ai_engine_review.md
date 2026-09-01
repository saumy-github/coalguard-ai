# `ai_engine` Review — har2312's Work (as of 2026-09-01)

> **Last updated:** 2026-09-01 (uncommitted — not yet pushed, exists only in this local working tree) · 
**Status:** CURRENT — audit report

Read-only audit. No code was modified while producing this report.

## TL;DR

- **The fine-tuned PPE model is not actually being used at runtime**, despite a commit claiming otherwise. `cv_engine.py` looks for a file `data/models/best.pt`; what exists on disk is a *directory* `data/models/best/` (raw exploded PyTorch checkpoint internals). The `.exists()` check fails, so it silently falls back to the generic COCO `yolov8n.pt` — nobody would notice from the API response alone. See §3.
- **The Docker setup regressed** from the repo's established pattern: Python was rolled back from `3.12-slim` to `3.10-slim`, all BuildKit cache mounts were removed (pip/apt now reinstall from scratch every rebuild), and the CPU-only torch install switched from `--index-url` (guaranteed CPU-only) to `--extra-index-url` (can ambiguously resolve to a GPU/CUDA build from PyPI). See §4.
- **Repo bloat**: his first commit added 21,025 files / 38,004 insertions in one go, including a 58MB zip and several large PDFs, plus ~21,000 YOLO label files and a notebook that were reverted two commits later — but the revert doesn't remove them from git history, so `.git` is now 573MB. The `.venv` he built locally (2.1GB) was never committed, which is the one good sign here.
- No secrets, hardcoded absolute paths, or committed `.env` were found. The real gap is a missing `ai_engine/.env.example` — the project convention (every service has one) was skipped for the one new required variable (`GROQ_API_KEY`).

---

## 1. Commit History (author: `har2312`)

All 6 of his commits touch only `ai_engine/` (plus the root `docker-compose.yml`/`.gitignore` twice, incidentally). Chronological:

| Commit | Date | Summary |
| --- | --- | --- |
| `48b488c` | 2026-08-29 22:30 | `feat(ai_engine): complete ML service with CV PPE, RAG compliance, and predictive analytics` — **21,025 files changed, 38,004 insertions(+), 5 deletions(-)**. Added `src/main.py`, `cv_engine.py`, `rag_engine.py`, `predictive_engine.py`, `ingest_rag.py`, `train_cv.py`, plus **the entire raw training dataset** (thousands of YOLO label `.txt` files under a helmet/vest dataset), a Kaggle notebook, several rulebook PDFs, and a 58MB telemetry dataset zip. Also bumped `requirements.txt` and tweaked `docker-compose.yml`. |
| `a969709` | 2026-08-29 23:24 | `chore(ai_engine): remove dataset images from git tracking and add to gitignore` — **21,005 files changed, 2 insertions(+), 36,250 deletions(-)**. Removes the YOLO label files and the notebook from git, adds ignore rules. Does **not** remove the rulebook PDFs or the 58MB zip (still tracked, see §2). |
| `1ea18cb` | 2026-08-30 16:11 | `fix(ai_engine): correct health check status logic, integrate fine-tuned PPE weights` — small, 1 file / 16 lines. Points `cv_engine.py` at fine-tuned weights (but see §3 — the weights path is broken). |
| `acd356d` | 2026-08-30 16:22 | `docs(ai_engine): add comprehensive technical documentation and fix health check logic` — adds `AI_ENGINE_DOCS.md` (597 lines). Message claims a health-check fix but the diff is 100% new doc content, no code. |
| `04929a1` | 2026-08-31 00:14 | `fix(ai_engine): replace Prophet with linear trend forecasting to resolve stan backend error` — reasonable fix, Prophet's `pystan` backend is a known pain to build. Removes `prophet` from `requirements.txt`, rewrites the forecast function, adds `*.zip` to root `.gitignore` (closes the barn door after the 58MB zip already got in). |
| `27b3fa0` | 2026-08-31 11:02 | `build(docker): optimize Dockerfile, update .dockerignore, remove prophet dep` — despite the message, this is a **regression**, not an optimization (see §4). |

**Assessment**: the first commit is the core problem — it looks like `git add .` was run inside a directory that had a full Kaggle dataset download and a venv-adjacent working state, without checking `git status` first. The cleanup commit two hours later shows he noticed, but only partially fixed it (see §2). Commit messages are otherwise clear and conventional; no force-pushes visible on this branch.

## 2. The `.venv` / Committed-Artifacts Issue

- **`.venv` itself was never committed.** `git log --all -- ai_engine/.venv ai_engine/venv` returns nothing. It exists on disk now at `ai_engine/.venv/` (2.1GB, Python 3.12.3, with `ultralytics`, `torch`, `chromadb`, `langchain`, etc. installed) and is correctly covered by the root `.gitignore` (`.venv`, `venv/` — lines 153/155). So: he's clearly been running/testing things locally outside Docker (a real workflow deviation from `SETUP.md`, which says nobody needs Python installed locally), but at least he didn't check the venv itself into git.
- **What *did* get committed and is still in HEAD right now** (`git ls-tree -r HEAD -- ai_engine/data`), all from `48b488c` and never removed:
  - `ai_engine/data/telemetry/yd7vw4c5mk-1/methane_data.zip` — **58,631,456 bytes**
  - `ai_engine/data/rulebooks/NAAQS_2019.pdf` — 15,295,581 bytes
  - `ai_engine/data/rulebooks/coal-mines-regulations-2017.pdf` — 2,011,492 bytes
  - `ai_engine/data/telemetry/Report-Coal-mine-methanes-critical-moment-in-India-2.pdf` — 1,795,660 bytes
  - `ai_engine/data/telemetry/yd7vw4c5mk-1/plots.pdf` — 995,257 bytes
  - `ai_engine/data/telemetry/1-s2.0-S2352340921007393-main.pdf` — 493,796 bytes
  - `ai_engine/data/rulebooks/so1533.pdf`, `Air_quality_standards.pdf` — smaller
  - These total ~79MB currently in the working tree, and the **21,000+ deleted label files and the notebook are still in git history forever** (a969709 removed them from HEAD, not from history) — that's the majority of why `.git` is now **573MB**.
- The rulebook PDFs are arguably legitimate to keep (they're the RAG source corpus and are small-ish individually), but the 58MB zip and the 15MB `NAAQS_2019.pdf` should not be in git — Git LFS or an out-of-repo data-fetch step would be the fix, but that's a decision for you and him, not something to silently redo.
- Everyone who now clones or pulls this repo pays for that 573MB permanently unless someone rewrites history (`git filter-repo`/BFG) — worth deciding deliberately with the team rather than doing unilaterally, since it rewrites shared history.

## 3. Current Code State vs. Intended Scope

Read `ai_engine/src/main.py`, `cv_engine.py`, `rag_engine.py`, `predictive_engine.py`, `ingest_rag.py`, `train_cv.py` in full.

**What's actually implemented** (not stubs — real logic):
- `POST /api/cv/detect` — real YOLOv8 inference via `ultralytics`, returns bounding boxes, helmet/vest counts, and a `violation_detected` flag based on a helmet-count-vs-vest-count mismatch heuristic.
- `POST /api/predictive/anomaly` — real IsolationForest + hardcoded regulatory thresholds (methane/CO/air velocity/temperature) from Coal Mines Regulations 2017, returns NORMAL/WARNING/CRITICAL.
- `POST /api/predictive/forecast` — linear trend forecast (post Prophet-removal) against an EC cap, real logic.
- `POST /api/rag/check-compliance` — real LangChain + Chroma + Groq (`llama` via `ChatGroq`) retrieval-augmented pipeline, returns a structured compliance status, citations (source file + page number), and applicable regulations. This matches `research/lld.md` §7i reasonably well — it's the "chat/ad-hoc question" shape more than "auto-map every observation," which lines up with the "chat-first" build-order recommendation already in that doc.
- `ingest_rag.py` — one-off script to chunk the rulebook PDFs and build the Chroma DB.
- `train_cv.py` — one-off YOLOv8 fine-tuning script against a `safety-Helmet-Reflective-Jacket` dataset.

**Bug found — the fine-tuned model isn't actually loaded:**
`cv_engine.py:36` sets `FINE_TUNED_WEIGHTS = BASE_DIR / "data" / "models" / "best.pt"` (a **file**), and `train_cv.py:33` confirms training is supposed to output to that same path. But what's on disk right now is `ai_engine/data/models/best/` — a **directory** containing `data.pkl`, `byteorder`, `version`, `.storage_alignment`, `.format_version`, and a `data/` subfolder — i.e., the raw internals of a PyTorch zip-format checkpoint that has been extracted in place (looks like `best.pt` got unzipped into a folder named `best` instead of staying a single file, likely by hand or by a tool run in the wrong spot). Since `FINE_TUNED_WEIGHTS.exists()` checks for a file at that exact path, it returns `False`, and `_load_model()` (`cv_engine.py:79-99`) silently falls back to `FALLBACK_WEIGHTS = "yolov8n.pt"` — the generic, un-fine-tuned COCO model. Commit `1ea18cb` ("integrate fine-tuned PPE weights") does not fix this — it only changed health-check logic in `main.py`, not this path. **The PPE detector currently in this repo is running the stock COCO model, not his trained one**, and there's no error or log a normal run would surface loudly (only a `logger.warning`) — this would be easy to demo without anyone noticing.

**Also note**: neither `train_cv.py` nor `ingest_rag.py` are run automatically anywhere (not in the `Dockerfile`, not in `docker-compose.yml`). They're manual bootstrap steps. `ingest_rag.py`'s output (`ai_engine/data/chroma_db/`) does not currently exist on disk, so the RAG endpoint would raise a `FileNotFoundError` (handled, returns HTTP 503) until someone runs it manually. And since the raw training dataset was deleted from git tracking in `a969709`, nobody else can currently re-run `train_cv.py` from a fresh clone even if they wanted to — the fine-tuning is only reproducible on his machine.

**Documentation is now stale**: `AI_ENGINE_DOCS.md` (added in `acd356d`, before Prophet was removed) still describes Prophet extensively — "Uses Facebook Prophet," a full "Prophet fits a time-series model" walkthrough, and lists `prophet==1.1.6` in a requirements excerpt (line 585) — none of which matches current code after `04929a1`. `AI_ENGINE_GUIDE.md` has the same staleness (lines 25, 142). Neither doc was updated in the Prophet-removal commit.

## 4. Docker Integration

Compared the current `ai_engine/Dockerfile` against the version that existed immediately before his first commit (`git show 48b488c7^:ai_engine/Dockerfile`) and against `backend/Dockerfile` (untouched, still following the pattern the team agreed on earlier).

**Regressions in the current `ai_engine/Dockerfile`** (introduced across `48b488c` and `27b3fa0`):

1. **Python downgraded 3.12 → 3.10.** Line 1: `FROM python:3.10-slim`. The rest of the repo (backend, and ai_engine's own prior version) standardized on `python:3.12-slim` deliberately, after working through `lru-dict`/`chroma-hnswlib` wheel-availability issues on 3.12. Reverting to 3.10 for one service reintroduces a version split across containers for no stated reason, and 3.10 has an earlier EOL.
2. **All BuildKit cache mounts removed.** The prior Dockerfile used `RUN --mount=type=cache,target=/var/cache/apt,...` and `RUN --mount=type=cache,target=/root/.cache/pip,...` (this was the earlier, deliberate optimization that cut backend rebuild time from ~48s to ~2.7s — see `research/lld.md` build notes). The current version uses plain `apt-get update && ... && rm -rf /var/lib/apt/lists/*` and `pip install --no-cache-dir` — the `--no-cache-dir` flag is the literal opposite of what was set up, and there's no longer a `# syntax=docker/dockerfile:1` directive at the top of the file (needed for the `--mount` syntax to parse at all). Every dependency change now forces a full network re-download instead of hitting a persistent cache.
3. **`--index-url` → `--extra-index-url` for the CPU-only torch install** (Dockerfile line 19). The prior version used `--index-url https://download.pytorch.org/whl/cpu`, which *replaces* the default index entirely — guaranteeing the CPU-only build. `--extra-index-url` *adds* the CPU index alongside PyPI's default index; pip's resolver does not reliably prefer the secondary index when both offer a same-numbered version, so this can non-deterministically resolve to PyPI's default (CUDA-bundled) `torch==2.3.0` instead of the CPU-only build — silently reintroducing the ~1.5-2GB of unused CUDA libs the earlier CPU-only decision was meant to avoid. I did not build the image to confirm which one it actually resolves to on this machine/pip version — flagging as a real risk, not a confirmed failure.

**Would `npm run dev:up:all` build and run his current code?** Likely yes, mechanically — I didn't find a hard blocker (no missing apt package for anything in `requirements.txt`; `build-essential`/`libgl1`/`libglib2.0-0` cover `chromadb`/`opencv`/`ultralytics`'s native deps; `EXPOSE 8000` and the Dockerfile `CMD`/compose `command` both target port 8000 internally, matching `docker-compose.yml`'s `8001:8000` mapping — no port mismatch). The real problems are the ones above (slower rebuilds, possible GPU torch, older Python) plus the functional bug in §3 (wrong model loaded) — none of which would surface as a build failure, only as slower builds or quietly-wrong behavior.

**`requirements.txt`** additions (`scikit-learn`, `numpy`, `pandas`, `langchain-chroma`, `langchain-groq`, `chromadb`, `sentence-transformers`, `pypdf`) are all pure-Python or already covered by the existing apt packages — no new system dependency gaps found there.

## 5. Other Issues

- **No secrets or committed `.env` found.** Grepped `ai_engine/src` and root `.py` files for API-key-shaped strings and absolute paths — nothing. `ai_engine/.env` exists on disk (236 bytes, one variable) and was never committed (`git log --all -- ai_engine/.env` is empty); it's covered by both the generic `.env` and the explicit `ai_engine/.env` line in the root `.gitignore`.
- **Missing `ai_engine/.env.example`.** The project convention (established for `backend`/`frontend` — see `SETUP.md`) is: only `.env.example` gets committed, real `.env` never does. `ai_engine` now needs exactly one variable, `GROQ_API_KEY` (required by `rag_engine.py:101-106`, will raise `EnvironmentError` → HTTP 503 without it), but no `.env.example` was added for it. Anyone cloning fresh has to read `rag_engine.py`'s source to discover this.
- **No hardcoded absolute paths** — `train_cv.py` and `ingest_rag.py` both correctly derive `BASE_DIR` from `Path(__file__).resolve().parent`, not a hardcoded local path.
- **No TODO/FIXME markers** left in the code.
- **Docs drift** — covered in §3, worth a follow-up pass once someone confirms which forecasting approach and model-loading path is final.
- **CORS wide open** (`main.py:53`, `allow_origins=["*"]`) — fine for a hackathon prototype, just flagging since it's a change from a locked-down default; not unique to his work, worth deciding once for the whole repo rather than per-service.

---

*Compiled by static review only — no `docker build`, no code execution, no files modified.*
