# 🛡️ CoalGuard AI Engine — ML Service Documentation

> **Last updated:** 2026-08-29 · 
**Status:** STALE — still describes Prophet-based forecasting (removed in commit 04929a1) and lists `best.pt` as the loaded model though it's currently broken/falling back to stock weights; see research/ai_engine_review.md §3

**SIH Problem Statement PS26024:** Smart Governance and Compliance Monitoring System for Coal Mines

---

## 📌 Overview
The **AI Engine** is a high-performance Python/FastAPI micro-service that powers automated safety compliance, computer vision monitoring, environmental sensor anomaly detection, and statutory regulatory intelligence for coal mining operations.

---

## 🏗️ Architecture & Modules

```
ai_engine/
├── Dockerfile                         # CPU-optimized Docker container definition
├── requirements.txt                   # Version-locked ML & API dependencies
├── ingest_rag.py                      # Offline RAG ingestion pipeline (PDFs -> ChromaDB)
├── train_cv.py                        # YOLOv8 PPE fine-tuning training script
├── AI_ENGINE_GUIDE.md                 # Full service documentation (this file)
│
├── src/
│   ├── __init__.py                    # Package init
│   ├── main.py                        # FastAPI gateway, CORS, Pydantic schemas, routing
│   ├── cv_engine.py                   # Computer Vision PPE inference & violation detection
│   ├── predictive_engine.py           # IsolationForest sensor anomalies + Prophet extraction forecasting
│   └── rag_engine.py                  # LangChain + Groq RAG compliance auditor
│
└── data/
    ├── models/                        # YOLO PPE datasets & fine-tuned checkpoints (best.pt)
    ├── rulebooks/                     # Statutory PDFs (CMR 2017, NAAQS, Air Quality, SO1533)
    ├── telemetry/                     # Time-series multi-sensor coal mine datasets
    └── chroma_db/                     # Persistent ChromaDB vector database (1225+ vectors)
```

---

## 🚀 Micro-Service Endpoints

Base URL: `http://localhost:8000` (or `http://localhost:8001` if mapped via Docker)

### 1. Health Check
- **Route:** `GET /health`
- **Description:** Returns operational readiness status for all ML modules.
- **Sample Response:**
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

### 2. Computer Vision — PPE Detection
- **Route:** `POST /api/cv/detect`
- **Method:** `multipart/form-data`
- **Input:** `file` (image binary), optional `confidence` float (default: `0.25`)
- **Features:**
  - Detects **Safety Helmets** (Class 0) and **Reflective Jackets** (Class 1).
  - Flags safety violations when personnel are missing complete PPE kits.
- **Sample Response:**
  ```json
  {
    "total_detections": 4,
    "helmet_count": 2,
    "vest_count": 1,
    "violation_detected": true,
    "violation_reason": "PPE mismatch — 2 helmet(s) vs 1 reflective jacket(s) detected.",
    "bounding_boxes": [
      {
        "class_id": 0,
        "class_name": "Safety-Helmet",
        "confidence": 0.8921,
        "x_min": 120.5,
        "y_min": 45.2,
        "x_max": 210.0,
        "y_max": 140.8
      }
    ],
    "model_used": "data/models/best.pt"
  }
  ```

---

### 3. Predictive Analytics — Multi-Sensor Anomaly Detection
- **Route:** `POST /api/predictive/anomaly`
- **Input Schema:**
  ```json
  {
    "methane": 1.2,
    "co": 28.5,
    "air_velocity": 1.5,
    "temperature": 29.0
  }
  ```
- **Features:**
  - Evaluates individual gas & atmospheric readings against **DGMS / Coal Mines Regulations 2017** statutory thresholds.
  - Computes multi-dimensional outlier scores using a fitted `IsolationForest`.
  - Outputs risk classification (`NORMAL`, `WARNING`, `CRITICAL`).
- **Sample Response:**
  ```json
  {
    "overall_risk": "WARNING",
    "anomaly_count": 2,
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
      "anomaly_score": -0.042189,
      "is_outlier": true
    }
  }
  ```

---

### 4. Predictive Analytics — Production Limit Forecasting
- **Route:** `POST /api/predictive/forecast`
- **Input Schema:**
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
- **Features:**
  - Employs **Facebook Prophet** time-series forecasting to model production trajectory.
  - Flags Environmental Clearance (EC) legal cap breaches (`COMPLIANT`, `AT_RISK`, `EXCEEDED`).

---

### 5. Statutory RAG Compliance Auditor
- **Route:** `POST /api/rag/check-compliance`
- **Input Schema:**
  ```json
  {
    "observation": "Workers in underground section 4 are operating without safety helmets and methane reading is 1.2%"
  }
  ```
- **Features:**
  - Vector similarity search over 1,225 chunks in ChromaDB (`all-MiniLM-L6-v2` embeddings).
  - Retrieval-Augmented Generation with Groq LLM (`openai/gpt-oss-120b`).
  - Returns statutory citations (Regulation name, exact page number, text excerpts) and structured legal analysis with remediation steps.

---

## ⚙️ Setup & Local Execution

### 1. Prerequisites
- Python 3.10 installed locally or Docker Desktop.

### 2. Environment Configuration
Create or edit `ai_engine/.env`:
```env
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=openai/gpt-oss-120b
```

### 3. Local Virtual Environment Setup
```powershell
cd ai_engine
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
pip install -r requirements.txt
```

### 4. Ingest Regulatory Rulebooks (One-time)
```powershell
python ingest_rag.py
```

### 5. Train / Fine-tune Computer Vision Model
```powershell
python train_cv.py --epochs 50 --batch 16
```

### 6. Start the API Gateway
```powershell
uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload
```

---

## 🐳 Docker Deployment
To run via Docker Compose alongside the whole stack:
```bash
docker compose up -d ai_engine
```
Logs:
```bash
docker compose logs -f ai_engine
```
