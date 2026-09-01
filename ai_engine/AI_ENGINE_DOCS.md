# 🛡️ CoalGuard AI Engine — Complete Technical Documentation

> **Last updated:** 2026-08-30 · 
**Status:** STALE — still describes Facebook Prophet forecasting (removed in commit 04929a1) and shows an incorrect Next.js/Express.js architecture diagram that doesn't match the actual React+Vite frontend / FastAPI backend; see research/ai_engine_review.md §3

**SIH Problem Statement PS26024**: Smart Governance & Compliance Monitoring System for Coal Mines  
**Module**: `ai_engine/` — ML Micro-Service  
**Last Updated**: August 2026

---

## Table of Contents

1. [What We Built](#1-what-we-built)
2. [Architecture & Design Decisions](#2-architecture--design-decisions)
3. [Module Deep Dives](#3-module-deep-dives)
4. [How It All Works Together](#4-how-it-all-works-together)
5. [Training Results](#5-training-results)
6. [How to Run](#6-how-to-run)
7. [API Reference](#7-api-reference)
8. [Integration Guide — Connecting with Backend & Frontend](#8-integration-guide--connecting-with-backend--frontend)
9. [What To Do Next](#9-what-to-do-next)
10. [Future Improvements](#10-future-improvements)

---

## 1. What We Built

We built a **standalone AI/ML micro-service** that acts as the intelligent brain of the CoalGuard platform. It provides four core capabilities:

| Capability | Module | What It Does |
|---|---|---|
| **PPE Detection** | `cv_engine.py` | Analyses CCTV/uploaded images to detect safety helmets and reflective jackets, flags violations when workers lack proper PPE |
| **Sensor Anomaly Detection** | `predictive_engine.py` | Takes real-time methane, CO, temperature, and air velocity readings and classifies risk levels (NORMAL / WARNING / CRITICAL) |
| **Production Forecasting** | `predictive_engine.py` | Uses Facebook Prophet to forecast coal extraction for the next 30 days and flags if Environmental Clearance (EC) caps will be breached |
| **Regulatory Compliance (RAG)** | `rag_engine.py` | Takes a text observation (e.g., "methane at 1.2% in section 4") and retrieves relevant Coal Mine Regulations, then uses an LLM to generate a legal compliance analysis with exact statute citations |

All of this is exposed through a **FastAPI REST API** (`main.py`) that the backend/frontend can call.

---

## 2. Architecture & Design Decisions

### 2.1 High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js)                            │
│  Dashboard  │  CCTV Feed  │  Sensor Graphs  │  Compliance Panel     │
└──────────┬───────────┬───────────┬────────────────┬──────────────────┘
           │           │           │                │
           ▼           ▼           ▼                ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     Backend (Express.js / Node)                      │
│             Routes  │  Auth  │  Database  │  WebSocket               │
└──────────┬───────────┬───────────┬────────────────┬──────────────────┘
           │           │           │                │
           ▼           ▼           ▼                ▼
┌──────────────────────────────────────────────────────────────────────┐
│                   AI ENGINE (FastAPI — This Module)                   │
│                                                                       │
│  ┌─────────────┐  ┌──────────────────┐  ┌──────────────────────────┐ │
│  │ CV Engine   │  │ Predictive Engine │  │ RAG Compliance Engine   │ │
│  │ (YOLOv8)    │  │ (IsolationForest  │  │ (ChromaDB + Groq LLM)  │ │
│  │             │  │  + Prophet)       │  │                         │ │
│  └─────────────┘  └──────────────────┘  └──────────────────────────┘ │
│                                                                       │
│  Models: best.pt   Thresholds: DGMS     Vector DB: 1225 chunks      │
│  (6.2 MB)          statutory limits      from 4 regulatory PDFs      │
└──────────────────────────────────────────────────────────────────────┘
```

### 2.2 Key Design Decisions

| Decision | Why |
|---|---|
| **Standalone FastAPI service** | Decouples ML from the Node.js backend; can scale independently, deploy on GPU servers, or run in Docker |
| **Lazy model loading** | Heavy models (YOLO, Prophet, Sentence Transformers) are loaded only on first request, not at startup — reduces cold-start time |
| **CPU-only PyTorch** | Keeps the Docker image ~500MB instead of ~5GB with CUDA; sufficient for inference workloads |
| **ChromaDB for vector store** | Lightweight, file-based, no external DB server needed; perfect for a hackathon demo |
| **Groq LLM (via LangChain)** | Free tier, ultra-fast inference (~1s response), no GPU needed on our side |
| **Statutory thresholds hardcoded** | DGMS/CMR 2017 gas limits don't change frequently; hardcoding avoids an extra config layer |

### 2.3 File Structure

```
ai_engine/
├── .env                           # GROQ_API_KEY (git-ignored)
├── Dockerfile                     # Production container
├── requirements.txt               # 17 version-locked dependencies
├── AI_ENGINE_GUIDE.md             # Quick reference guide
├── AI_ENGINE_DOCS.md              # This file — full documentation
├── ingest_rag.py                  # One-time: PDFs → ChromaDB vectors
├── train_cv.py                    # One-time: Fine-tune YOLOv8 on PPE dataset
│
├── src/
│   ├── __init__.py
│   ├── main.py                    # FastAPI app — all endpoints
│   ├── cv_engine.py               # YOLOv8 PPE detection
│   ├── predictive_engine.py       # Anomaly detection + forecasting
│   └── rag_engine.py              # RAG compliance engine
│
└── data/
    ├── models/                    # PPE datasets + best.pt (git-ignored)
    │   ├── best.pt                # Fine-tuned YOLO weights (96.1% mAP50)
    │   └── safety-Helmet-Reflective-Jacket/  # Training dataset
    ├── rulebooks/                 # 4 statutory PDFs
    │   ├── coal-mines-regulations-2017.pdf
    │   ├── Air_quality_standards.pdf
    │   ├── NAAQS_2019.pdf
    │   └── so1533.pdf
    ├── telemetry/                 # Sample sensor CSV data
    └── chroma_db/                 # Persistent vector database (git-ignored)
```

---

## 3. Module Deep Dives

### 3.1 Computer Vision — PPE Detection (`cv_engine.py`)

**What it does**: Accepts an image, runs YOLOv8 object detection, and returns bounding boxes for Safety Helmets (Class 0) and Reflective Jackets (Class 1).

**How it works**:
1. Image bytes arrive via the `/api/cv/detect` endpoint
2. PIL opens and converts the image to RGB
3. YOLOv8 runs inference with configurable confidence threshold (default 0.25)
4. Results are parsed into structured `BoundingBox` dataclasses
5. **Violation logic**: If helmets detected ≠ jackets detected, a mismatch is flagged (someone has a helmet but no vest, or vice versa)

**Model**: `best.pt` — fine-tuned YOLOv8-nano on 10,000+ labeled images of workers wearing helmets and reflective jackets.

**Key code flow**:
```python
model = YOLO("data/models/best.pt")  # Lazy loaded on first call
results = model.predict(image, conf=threshold)
# Parse boxes → count helmets vs jackets → flag violations
```

### 3.2 Predictive Analytics — Anomaly Detection (`predictive_engine.py`)

**What it does**: Takes a set of sensor readings (methane %, CO ppm, temperature °C, air velocity m/s) and classifies each as NORMAL, WARNING, or CRITICAL.

**How it works** (two-layer approach):

**Layer 1 — Statutory Threshold Checks**:
Each sensor is compared against DGMS/Coal Mines Regulations 2017 limits:

| Sensor | Warning Threshold | Critical Threshold | Source |
|---|---|---|---|
| Methane (CH₄) | ≥ 1.0% | ≥ 2.0% | CMR 2017 Reg. 188 |
| Carbon Monoxide (CO) | ≥ 50 ppm | ≥ 100 ppm | DGMS Circular |
| Temperature | ≥ 32°C | ≥ 37°C | CMR 2017 Reg. 180 |
| Air Velocity | < 0.3 m/s | < 0.1 m/s | CMR 2017 Reg. 164 |

**Layer 2 — IsolationForest (Multi-dimensional outlier detection)**:
A bootstrapped IsolationForest model trained on synthetic "normal" distributions detects multi-dimensional anomalies that single-sensor thresholds might miss (e.g., methane at 0.9% AND low air velocity is dangerous even though neither alone crosses the threshold).

### 3.3 Predictive Analytics — Production Forecasting (`predictive_engine.py`)

**What it does**: Takes historical daily production data and forecasts the next N days using Facebook Prophet. Compares cumulative forecasted production against the Environmental Clearance (EC) cap.

**How it works**:
1. Historical data is formatted into Prophet's `ds`/`y` format
2. Prophet fits a time-series model with daily seasonality
3. Forecasts are generated for the requested horizon (default 30 days)
4. Cumulative production is computed and compared against EC cap
5. Status: `COMPLIANT` / `AT_RISK` (>80% of cap) / `EXCEEDED`

### 3.4 RAG Compliance Engine (`rag_engine.py`)

**What it does**: Takes a plain-English observation about a mine and returns a structured legal compliance analysis with exact regulatory citations.

**How it works** (Retrieval-Augmented Generation):

```
Step 1: INGEST (one-time, via ingest_rag.py)
  4 PDFs → PyPDFLoader → 1,225 text chunks → all-MiniLM-L6-v2 embeddings → ChromaDB

Step 2: QUERY (per request)
  Observation text
       ↓
  Embed with same model
       ↓
  ChromaDB similarity search → Top 5 relevant chunks
       ↓
  Construct prompt: [System: You are a compliance analyst] + [Context: 5 chunks] + [Observation]
       ↓
  Send to Groq LLM (openai/gpt-oss-120b)
       ↓
  Parse response → ComplianceResult with citations
```

**Why RAG instead of just prompting an LLM?**
- The LLM doesn't have Coal Mines Regulations 2017 in its training data
- RAG grounds the response in actual statutory text with page numbers
- Reduces hallucination — the LLM can only cite what it was given

---

## 4. How It All Works Together

### Request Flow Example: "Check if this mine scene is compliant"

```
1. Frontend uploads a CCTV image
   → Backend receives it
   → Backend calls AI Engine: POST /api/cv/detect

2. AI Engine runs YOLO inference
   → Returns: 3 helmets, 2 vests → VIOLATION DETECTED

3. Backend simultaneously sends sensor data
   → Backend calls AI Engine: POST /api/predictive/anomaly
   → Returns: Methane 1.2% = WARNING, CO normal, Temp normal

4. Backend generates an observation string:
   "PPE violation detected in Section 4. Methane at 1.2%."
   → Backend calls AI Engine: POST /api/rag/check-compliance
   → Returns: Legal analysis citing CMR 2017 Reg. 188 and Reg. 227

5. Frontend displays unified compliance dashboard with:
   - Annotated image with bounding boxes
   - Sensor risk gauges
   - Legal compliance card with citations
```

---

## 5. Training Results

The YOLOv8-nano model was fine-tuned on **Kaggle** using the `safety-Helmet-Reflective-Jacket` dataset.

### Training Configuration
| Parameter | Value |
|---|---|
| Base Model | YOLOv8-nano (yolov8n.pt) |
| Dataset | safety-Helmet-Reflective-Jacket (~10,500 images) |
| Classes | 2 (Safety-Helmet, Reflective-Jacket) |
| Epochs | 100 |
| Batch Size | 32 |
| Image Size | 640×640 |
| Optimizer | Auto (SGD with cosine LR) |
| AMP | Enabled (mixed precision) |

### Final Metrics (Epoch 100)
| Metric | Score |
|---|---|
| **mAP50** | **96.1%** |
| **mAP50-95** | **78.3%** |
| **Precision** | **92.9%** |
| **Recall** | **93.0%** |
| **Model Size** | 6.26 MB |

### Training Artifacts
Located in `runs/runs/detect/runs/ppe_detect/train/`:
- `results.csv` — Per-epoch metrics
- `results.png` — Training loss/metric curves
- `confusion_matrix.png` — Class-level performance
- `val_batch*_pred.jpg` — Validation predictions visualized
- `weights/best.pt` — Best checkpoint (copied to `ai_engine/data/models/best.pt`)

---

## 6. How to Run

### 6.1 Prerequisites
- **Python 3.10** (not 3.13 — some ML packages don't support it yet)
- **Git** with `core.longpaths = true` (for Windows)

### 6.2 First-Time Setup

```powershell
cd ai_engine

# Create virtual environment with Python 3.10
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# Install CPU-only PyTorch (smaller download)
pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu

# Install all dependencies
pip install -r requirements.txt
```

### 6.3 Configure Environment

Create/edit `ai_engine/.env`:
```env
GROQ_API_KEY=gsk_your_actual_key_here
GROQ_MODEL=openai/gpt-oss-120b
```

Get your free API key from [console.groq.com/keys](https://console.groq.com/keys).

### 6.4 One-Time Data Preparation

```powershell
# Build the vector database from regulatory PDFs
python ingest_rag.py
# Output: data/chroma_db/ with 1,225 vectors

# (Optional) Fine-tune YOLO — or copy best.pt from Kaggle run
python train_cv.py --epochs 50
# Output: data/models/best.pt
```

### 6.5 Start the Server

```powershell
# Activate venv first
.\.venv\Scripts\Activate.ps1

# Start the API
uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload
```

Server will be available at `http://localhost:8000`.  
Interactive API docs at `http://localhost:8000/docs`.

### 6.6 Quick Smoke Test

```powershell
# Health check
curl http://localhost:8000/health

# Test compliance
curl -X POST http://localhost:8000/api/rag/check-compliance ^
  -H "Content-Type: application/json" ^
  -d "{\"observation\": \"Workers without helmets, methane at 1.2%\"}"
```

### 6.7 Docker

```bash
# Build
docker build -t coalguard-ai ./ai_engine

# Run
docker run -p 8000:8000 --env-file ai_engine/.env coalguard-ai
```

---

## 7. API Reference

### `GET /health`
Returns system status and module readiness.

**Response** (all healthy):
```json
{
  "status": "healthy",
  "modules": {
    "cv_engine": { "ready": true },
    "predictive_engine": { "ready": true },
    "rag_engine": { "chroma_db": true, "groq_api_key": true }
  }
}
```

---

### `POST /api/cv/detect`
Upload an image for PPE detection.

| Parameter | Type | Description |
|---|---|---|
| `file` | `multipart/form-data` | JPEG/PNG image |
| `confidence` | `float` (optional) | Detection threshold (default: 0.25) |

**Response**:
```json
{
  "total_detections": 4,
  "helmet_count": 2,
  "vest_count": 1,
  "violation_detected": true,
  "violation_reason": "PPE mismatch — 2 helmet(s) vs 1 reflective jacket(s).",
  "bounding_boxes": [...],
  "model_used": "data/models/best.pt"
}
```

---

### `POST /api/predictive/anomaly`
Evaluate sensor readings for anomalies.

**Request**:
```json
{
  "methane": 1.2,
  "co": 28.5,
  "air_velocity": 1.5,
  "temperature": 29.0
}
```

**Response**:
```json
{
  "overall_risk": "WARNING",
  "anomaly_count": 1,
  "sensor_reports": [
    {
      "sensor": "methane",
      "value": 1.2,
      "is_anomaly": true,
      "risk_level": "WARNING",
      "threshold_info": "METHANE at 1.20 exceeds warning threshold (1.0)."
    }
  ],
  "isolation_forest_scores": {
    "anomaly_score": -0.042,
    "is_outlier": true
  }
}
```

---

### `POST /api/predictive/forecast`
Forecast production and check EC cap compliance.

**Request**:
```json
{
  "history": [
    { "date": "2026-08-01", "production_tonnes": 4200.0 },
    { "date": "2026-08-02", "production_tonnes": 4450.0 }
  ],
  "ec_cap_tonnes": 150000.0,
  "forecast_days": 30
}
```

---

### `POST /api/rag/check-compliance`
Run a regulatory compliance check on a text observation.

**Request**:
```json
{
  "observation": "Workers in underground section 4 are operating without safety helmets and methane reading is 1.2%"
}
```

**Response** includes: `compliance_status`, `analysis`, `citations` (with PDF source, page number, text excerpt, relevance score), and `applicable_regulations`.

---

## 8. Integration Guide — Connecting with Backend & Frontend

### 8.1 Backend → AI Engine Communication

The Node.js backend should call the AI Engine via HTTP. Example using `axios`:

```javascript
// backend/services/aiEngine.js
const axios = require('axios');
const FormData = require('form-data');

const AI_ENGINE_URL = process.env.AI_ENGINE_URL || 'http://localhost:8000';

// PPE Detection
async function detectPPE(imageBuffer) {
  const form = new FormData();
  form.append('file', imageBuffer, { filename: 'frame.jpg', contentType: 'image/jpeg' });
  const res = await axios.post(`${AI_ENGINE_URL}/api/cv/detect`, form, {
    headers: form.getHeaders(),
  });
  return res.data;
}

// Anomaly Detection
async function checkSensorAnomaly(sensorData) {
  const res = await axios.post(`${AI_ENGINE_URL}/api/predictive/anomaly`, sensorData);
  return res.data;
}

// Compliance Check
async function checkCompliance(observation) {
  const res = await axios.post(`${AI_ENGINE_URL}/api/rag/check-compliance`, { observation });
  return res.data;
}

module.exports = { detectPPE, checkSensorAnomaly, checkCompliance };
```

### 8.2 Docker Compose Networking

In `docker-compose.yml`, the backend can reach the AI engine at `http://ai_engine:8000` via Docker's internal network:

```yaml
services:
  backend:
    environment:
      - AI_ENGINE_URL=http://ai_engine:8000

  ai_engine:
    build: ./ai_engine
    ports:
      - "8000:8000"
    env_file:
      - ./ai_engine/.env
```

### 8.3 Frontend Integration Points

| Frontend Component | AI Engine Endpoint | How to Integrate |
|---|---|---|
| CCTV Live Feed | `/api/cv/detect` | Capture frames every N seconds → send to backend → backend calls AI → overlay bounding boxes on canvas |
| Sensor Dashboard | `/api/predictive/anomaly` | Backend receives IoT data via MQTT/WebSocket → calls AI → pushes risk levels to frontend via WebSocket |
| Production Forecast Chart | `/api/predictive/forecast` | Backend fetches monthly production data from DB → calls AI → returns forecast array for charting |
| Compliance Panel | `/api/rag/check-compliance` | User types observation or system auto-generates one from violations → calls AI → displays analysis card |

### 8.4 Environment Variables

| Variable | Where | Description |
|---|---|---|
| `GROQ_API_KEY` | `ai_engine/.env` | Groq Cloud API key for LLM inference |
| `GROQ_MODEL` | `ai_engine/.env` | LLM model name (default: `openai/gpt-oss-120b`) |
| `AI_ENGINE_URL` | Backend `.env` | URL for backend to reach AI Engine |

---

## 9. What To Do Next

### Immediate (Before Demo)

- [ ] **Connect Backend to AI Engine**: Add the `axios` service layer in the backend to call the 4 AI endpoints
- [ ] **Wire Frontend Dashboard**: Display PPE detection results, sensor risk gauges, and compliance analysis on the dashboard
- [ ] **Add CORS origins**: Update `main.py` CORS settings to whitelist the frontend's production domain
- [ ] **Test Docker Compose**: Run `docker compose up` with all services and verify inter-service communication
- [ ] **Share the `data/` folder**: Zip and share `ai_engine/data/models/` and `ai_engine/data/chroma_db/` with teammates

### Short-Term

- [ ] **Real-time CCTV pipeline**: Set up a frame capture service that extracts frames from RTSP/webcam feeds and sends them to `/api/cv/detect` periodically
- [ ] **IoT sensor ingestion**: Connect MQTT broker or REST API from actual IoT sensors to feed the anomaly detection endpoint
- [ ] **Database logging**: Store all AI predictions (violations, anomalies, compliance results) in MongoDB/PostgreSQL for historical analysis
- [ ] **Alert system**: Auto-trigger email/SMS alerts when CRITICAL risk levels or PPE violations are detected

---

## 10. Future Improvements

### Model Improvements
- **Multi-class PPE detection**: Extend to detect goggles, gloves, boots, ear protection (need labeled data)
- **Person-PPE association**: Use pose estimation to associate each detected person with their PPE items (currently we just count totals)
- **Video inference**: Process video streams instead of single frames; add tracking for temporal consistency
- **Train on Indian coal mine data**: Current dataset is generic workplace PPE; domain-specific data would improve accuracy
- **Edge deployment**: Export YOLO to ONNX/TensorRT for deployment on edge devices (Jetson Nano) near CCTV cameras

### Predictive Engine Improvements
- **Train IsolationForest on real mine data**: Replace synthetic bootstrap with actual historical sensor readings from the mine
- **LSTM/Transformer for time-series**: Replace Prophet with deep learning models for more accurate production forecasting
- **Multi-mine support**: Support different threshold profiles per mine (different coal types have different gas emission profiles)
- **Predictive maintenance**: Predict equipment failures from vibration/temperature sensor patterns

### RAG Engine Improvements
- **Add more regulations**: Ingest DGMS Circulars, MOEF guidelines, state-specific rules
- **Structured output**: Parse LLM response into structured JSON (regulation IDs, violation severity scores)
- **Multi-language support**: Hindi and regional language observations
- **Fine-tune a smaller model**: Replace cloud LLM with a fine-tuned local model for offline/airgapped mine sites

### Infrastructure Improvements
- **GPU inference**: Deploy on a GPU instance for faster YOLO inference (~10ms vs ~200ms on CPU)
- **Model versioning**: Use MLflow or DVC to track model experiments and versions
- **Rate limiting**: Add API rate limiting to prevent abuse
- **Authentication**: Add API key or JWT auth between backend and AI engine
- **Monitoring**: Add Prometheus metrics for inference latency, error rates, model drift detection
- **CI/CD**: Auto-deploy AI engine when new model weights are pushed

---

## Appendix: Dependencies

```
fastapi==0.111.0          # Web framework
uvicorn==0.30.0           # ASGI server
python-dotenv==1.1.0      # .env file loading
ultralytics==8.2.15       # YOLOv8
torch + torchvision       # Deep learning (CPU)
prophet==1.1.6            # Time-series forecasting
scikit-learn==1.5.0        # IsolationForest
langchain==0.2.0          # LLM orchestration
langchain-groq==0.1.5     # Groq LLM provider
langchain-chroma==0.1.1   # ChromaDB integration
chromadb==0.5.0           # Vector database
sentence-transformers==3.0.0  # Text embeddings
pypdf==5.0.0              # PDF parsing
```

---

*Built for SIH 2024 — Team CoalGuard*
