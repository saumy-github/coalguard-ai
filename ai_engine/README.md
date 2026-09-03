# AI Engine

> **Last updated:** 2026-09-03 (uncommitted — not yet pushed, exists only in this local working tree) · 
**Status:** CURRENT — replaces `AI_ENGINE_GUIDE.md` and `AI_ENGINE_DOCS.md` (both deleted; they described a Facebook Prophet forecaster that's been removed, and a Next.js/Express architecture that never matched this repo's actual React+Vite/FastAPI backend)

Standalone ML micro-service for CoalGuard (SIH PS26024). A separate FastAPI HTTP server, called by `backend` over the network — not a library `backend` imports — so its heavy ML dependencies (torch, ultralytics, langchain, chromadb) stay isolated from the lean backend service.

## What it does

| Capability | Module | What it does |
|---|---|---|
| PPE detection | `src/cv_engine.py` | YOLOv8 on an uploaded image — detects safety helmets and reflective jackets, flags a violation when the counts don't match |
| Sensor anomaly detection | `src/predictive_engine.py` | Classifies a methane/CO/air-velocity/temperature reading as NORMAL / WARNING / CRITICAL, combining hardcoded DGMS/CMR-2017 thresholds with an IsolationForest outlier score |
| Production forecasting | `src/predictive_engine.py` | Linear-trend regression over historical daily production, projects forward N days, and checks the projection against an Environmental Clearance (EC) cap |
| Regulatory compliance (RAG) | `src/rag_engine.py` | Takes a free-text field observation, retrieves the most relevant chunks from the ingested regulatory PDFs (ChromaDB), and asks a Groq-hosted LLM for a compliance verdict with citations |

All four are exposed through `src/main.py` (FastAPI).

## Environment

Copy `.env.example` to `.env` and fill in a real key:

| Variable | Required | Description |
|---|---|---|
| `GROQ_API_KEY` | Yes | Groq Cloud API key — powers the RAG compliance engine's LLM calls. Without it, `/api/rag/check-compliance` returns a 503, but the other three endpoints work fine. Get one free at [console.groq.com/keys](https://console.groq.com/keys). |
| `GROQ_MODEL` | No | Defaults to `openai/gpt-oss-120b` if unset. |

## Running it

The container runs Python 3.12 with a venv at `/opt/venv`, already active on `PATH` — nothing to activate manually. `src/`, `data/`, `train_cv.py`, and `ingest_rag.py` are all bind-mounted from this folder, so edits on the host take effect immediately (only a `Dockerfile`/`requirements.txt` change needs a rebuild).

**Start it** (from the repo root):
```
docker compose up -d --build ai_engine
```
- API: `http://localhost:8001`
- Health check: `http://localhost:8001/health`
- Interactive docs: `http://localhost:8001/docs`

**Open a shell** (for training/ingestion, below):
```
docker compose exec ai_engine bash
```

**Stop it** (leaving the rest of the stack running):
```
docker compose stop ai_engine
```

## Training / data preparation

These are one-off scripts, not part of the running server — run them from inside the container shell above.

```
python ingest_rag.py                       # rebuilds data/chroma_db from data/rulebooks/*.pdf
python train_cv.py --epochs 50 --batch 32  # fine-tunes YOLO, writes data/models/best.pt
```

Both write into the bind-mounted `data/` folder, so results land directly on the host — no copying anything out of the container.

**`ingest_rag.py`** needs nothing beyond what's already in the repo (`data/rulebooks/*.pdf`) — it chunks the PDFs, embeds them with `sentence-transformers/all-MiniLM-L6-v2`, and persists to `data/chroma_db/`.

**`train_cv.py`** needs a labeled dataset at `data/models/safety-Helmet-Reflective-Jacket/data.yaml` that is **not** included in this repo (too large, and `.dockerignore`/`.gitignore`'d) — get it separately (the original fine-tune was done on Kaggle's `safety-Helmet-Reflective-Jacket` dataset) and place it at that path before running this script. Without it, `train_cv.py` will fail at the `model.train(...)` call. This doesn't block running the server — a working fine-tuned `data/models/best.pt` is already checked into `data/`, and `cv_engine.py` falls back to a generic (non-fine-tuned) `yolov8n.pt` if `best.pt` is ever missing.

## API reference

### `GET /health`
Per-module readiness. `"status": "healthy"` only when every module reports ready; `"degraded"` otherwise (e.g. `rag_engine.chroma_db: false` before `ingest_rag.py` has been run, or `groq_api_key: false` if `.env` isn't set).

### `POST /api/cv/detect`
`multipart/form-data`: `file` (image), `confidence` (optional float, default `0.25`).
```json
{"total_detections":4,"helmet_count":2,"vest_count":1,"violation_detected":true,
 "violation_reason":"PPE mismatch — 2 helmet(s) vs 1 reflective jacket(s).",
 "bounding_boxes":[...],"model_used":"data/models/best.pt"}
```

### `POST /api/predictive/anomaly`
```json
{"methane":1.2,"co":28.5,"air_velocity":1.5,"temperature":29.0}
```
```json
{"overall_risk":"WARNING","anomaly_count":2,"sensor_reports":[...],
 "isolation_forest_scores":{"anomaly_score":-0.61,"is_outlier":true}}
```

### `POST /api/predictive/forecast`
```json
{"history":[{"date":"2026-08-01","production_tonnes":4200},{"date":"2026-08-02","production_tonnes":4450}],
 "ec_cap_tonnes":150000,"forecast_days":30}
```
Returns `compliance_status` (`COMPLIANT` / `AT_RISK` / `EXCEEDED`) plus a `daily_forecast` array with confidence bounds.

### `POST /api/rag/check-compliance`
```json
{"observation":"Workers in underground section 4 are operating without safety helmets and methane reading is 1.2%"}
```
Returns `compliance_status` (`COMPLIANT` / `NON_COMPLIANT` / `REVIEW_REQUIRED`), a full-text `analysis`, `applicable_regulations`, and `citations` (source PDF filename, page, excerpt, relevance score).

## File structure

```
ai_engine/
├── .env / .env.example
├── Dockerfile
├── requirements.txt
├── README.md                      # this file
├── ingest_rag.py                  # one-time: PDFs → ChromaDB vectors
├── train_cv.py                    # one-time: fine-tune YOLOv8 on PPE dataset
├── src/
│   ├── main.py                    # FastAPI app — all endpoints
│   ├── cv_engine.py                # YOLOv8 PPE detection
│   ├── predictive_engine.py        # anomaly detection + forecasting
│   └── rag_engine.py                # RAG compliance engine
└── data/
    ├── models/best.pt              # fine-tuned YOLO weights (checked in)
    ├── rulebooks/*.pdf             # 4 statutory PDFs (checked in)
    ├── telemetry/                  # sample sensor data, reference only
    └── chroma_db/                  # persistent vector DB (git-ignored, rebuild with ingest_rag.py)
```

## Verified working (2026-09-03)

All four endpoints were exercised directly against a live container this session. Two real bugs were found and fixed in the process:

- **`data/models/best.pt` was corrupted** — it had been extracted (unzipped) into a `data/models/best/` folder instead of staying as a single `.pt` file, so `cv_engine.py` was silently falling back to the generic, non-fine-tuned `yolov8n.pt`. Reconstructed the zip from the extracted contents and confirmed YOLO loads it correctly with the right classes (`Safety-Helmet`, `Reflective-Jacket`).
- **`rag_engine.py`'s response parser didn't handle the LLM's markdown-bold labels** (`**COMPLIANCE_STATUS:**` vs. the literal `COMPLIANCE_STATUS:` it checked for), so `compliance_status` always came back `REVIEW_REQUIRED` and `applicable_regulations` was always empty, regardless of what the LLM actually said. Fixed the label matching; also fixed absolute Windows-style paths (from whichever machine last ran `ingest_rag.py`) leaking into the `citations[].source` field instead of just the filename.

## Known limitations (not bugs — inherent to the current design)

- **IsolationForest is trained on synthetic data**, not real mine telemetry (`predictive_engine.py`'s bootstrap ranges) — replace with real historical readings once the telemetry pipeline has enough data.
- **Sensor thresholds are hardcoded** to DGMS/CMR 2017 limits — fine since those don't change often, but there's no per-mine override.
- **No backend integration yet** — `backend/` doesn't call any of these endpoints today. Any HTTP client can call this service (it's framework-agnostic on the caller's side); inside `docker-compose.yml`'s network, it's reachable at `http://ai_engine:8000` from other containers.
- **CORS is wide open** (`allow_origins=["*"]`) — fine for local development, needs tightening before any real deployment.
