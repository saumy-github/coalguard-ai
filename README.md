# CoalGuard AI

AI-powered smart governance, safety, and compliance monitoring platform for India's coal mining sector — built for Smart India Hackathon 2026.

## 1. Project Information

- **Project Title:** CoalGuard AI — Autonomous Mine Governance & Intelligence Platform
- **PS ID:** 26024
- **PS Title:** AI-Based Smart Governance and Compliance Monitoring System for Coal Mines
- **Category:** Software
- **Theme:** Smart Automation

## 2. Problem Statement

Coal mine safety compliance today is fragmented and reactive. Hazardous conditions (gas buildup, poor ventilation, equipment faults) and PPE violations often go unnoticed until a scheduled inspection. Compliance records live in a single mutable database, so there's no way for a regulator to be sure a violation log wasn't quietly edited or deleted before an audit. Different stakeholders — workers, safety officers, corporate management, and regulators — have no shared, role-appropriate real-time view of a mine's safety status.

## 3. Proposed Solution

CoalGuard is a full-stack coal mine safety governance platform. Workers and safety officers report problems in plain text (optionally with a photo); an AI pipeline automatically classifies each report as a site hazard (gas, ventilation, temperature, equipment) or a personnel/PPE issue, assigns a severity, and routes it accordingly — no manual form-filling with dropdowns. A computer-vision model independently detects PPE violations (missing helmet/vest) from uploaded images. A predictive-analytics engine continuously evaluates sensor readings (methane, CO, air velocity, temperature) against safety thresholds and flags anomalies before they become incidents. 
A RAG-based compliance assistant checks observations against mining safety regulations. 
Every safety record is additionally fingerprinted (SHA-256) and anchored on the Ethereum blockchain, so any tampering with the MongoDB copy is independently detectable — a regulator can verify a record's authenticity directly against a public ledger, with no need to trust the database administrator. Attendance is marked via face-liveness biometric verification rather than manual sign-in sheets.

## 4. Key Features

- **AI-routed issue reporting** — one free-text report is automatically classified into the correct hazard/PPE category and severity, with photo attachment support and offline queuing for poor-connectivity sites.
- **Computer-vision PPE detection** — automatic helmet/vest violation detection from uploaded site photos.
- **Predictive sensor-anomaly detection** — flags abnormal methane/CO/ventilation/temperature readings against mine safety thresholds.
- **RAG-based regulatory compliance assistant** — checks observations against safety regulations using an LLM grounded on real documents.
- **Blockchain-anchored audit ledger** — every compliance record's hash is anchored on Ethereum Sepolia, giving regulators a tamper-evident, independently verifiable trail that survives even a compromised database.
- **Biometric attendance** — face-liveness verified attendance marking.
- **Role-scoped dashboards for five distinct roles** — Worker, Safety Officer, Corporate Manager, Regulator, and Admin — each seeing exactly the mines and records their role is authorized for.
- **Installable, offline-resilient frontend (PWA)** — installable app shell with offline page-load caching on top of an offline-first issue-report write queue.

## 5. Technology Stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS, Zustand, React Router, Axios, Leaflet,
- **Backend:** Python, FastAPI, Beanie (MongoDB ODM) + Motor, Pydantic, JWT auth (python-jose, passlib/bcrypt), Google OAuth, ReportLab (PDF reports)
- **AI/ML:** FastAPI microservice — Ultralytics YOLOv8 + OpenCV (PPE detection), scikit-learn Isolation Forest (sensor anomaly detection), LangChain + Groq (LLM) + ChromaDB + Sentence-Transformers (RAG compliance assistant & issue classifier), MediaPipe + DeepFace (face-liveness attendance)
- **Blockchain:** Solidity, Hardhat, OpenZeppelin AccessControl, web3.py, Ethereum (Sepolia testnet)
- **Database/Storage:** MongoDB (primary datastore), Redis (caching), ChromaDB (RAG vector store)
- **Development/Deployment:** Docker & Docker Compose (multi-service orchestration), Git

## 6. Architecture

Full design reference: [research/lld.md](research/lld.md).

```text
                          ┌───────────────┐
                          │   Frontend    │  React + Vite (PWA)
                          └───────┬───────┘
                                  │ REST (JWT)
                                  ▼
                          ┌───────────────┐        ┌────────────────┐
                          │    Backend     │◄──────►│ MongoDB + Redis │
                          │   (FastAPI)    │        └────────────────┘
                          └───┬───────┬────┘
                   REST/multipart     REST + API key
                              │           │
                              ▼           ▼
                    ┌─────────────────┐  ┌────────────────────┐
                    │    AI Engine     │  │  Blockchain Ledger  │
                    │   (FastAPI —     │  │   (FastAPI worker    │
                    │  YOLO, RAG/LLM,  │  │  + Solidity contract  │
                    │  anomaly, face)  │  │  on Ethereum Sepolia) │
                    └─────────────────┘  └────────────────────┘
```

The backend is the single source of truth for the application (MongoDB); it calls out to `ai_engine` for every ML task (PPE detection, anomaly checks, RAG compliance, issue classification, face-liveness attendance) and to the `blockchain` service to anchor a record's hash and to verify it later against the chain.

## 7. Repository Structure

```text
sih26/
├── ai_engine/                  # ML microservice — PPE CV, anomaly detection, RAG, classifier
│   ├── data/
│   ├── src/
│   ├── .dockerignore
│   ├── .env.example
│   ├── Dockerfile
│   ├── ingest_rag.py
│   ├── README.md
│   ├── requirements.txt
│   └── train_cv.py
├── backend/                    # Core API — auth, mines, issues, attendance, audit
│   ├── scripts/
│   ├── src/
│   ├── .dockerignore
│   ├── .env.example
│   ├── Dockerfile
│   └── requirements.txt
├── blockchain/                 # Solidity contract + on-chain anchoring worker service
│   ├── abi/
│   ├── contracts/
│   ├── scripts/
│   ├── src/
│   ├── test/
│   ├── tests/
│   ├── .dockerignore
│   ├── .env.example
│   ├── Dockerfile
│   ├── hardhat.config.js
│   ├── package-lock.json
│   ├── package.json
│   ├── pytest.ini
│   ├── requirements-dev.txt
│   ├── requirements.txt
│   └── SETUP.md
├── frontend/                   # React + Vite + TypeScript (PWA, deployed standalone)
│   ├── public/
│   ├── src/
│   ├── .env.example
│   ├── .eslintrc.cjs
│   ├── .gitignore
│   ├── .prettierrc
│   ├── index.html
│   ├── package-lock.json
│   ├── package.json
│   ├── postcss.config.js
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   ├── vercel.json
│   └── vite.config.ts
├── research/                   # design docs (lld.md is the current source of truth)
│   ├── 11_per_platform_dataset_search.csv
│   ├── 11_per_platform_dataset_search.md
│   ├── ai_engine_review.md
│   ├── architecture.md
│   ├── blockchain_ledger.md
│   ├── cleanup-plan.md
│   ├── deployment-7-sep.md
│   ├── feature-audit-6-sep.md
│   ├── frontend.txt
│   ├── implementation-plan-6-sep.md
│   ├── INDEX.md
│   ├── issue-reporting-ai-pipeline-notes-7-sep.md
│   ├── lld.md
│   ├── location-and-pwa-notes-7-sep.md
│   ├── ml-engineer-handoff-7-sep.md
│   ├── planning-conventions.md
│   └── prev_ps.md
├── submission/
│   └── DeluluDevs_SIH2026.pdf
├── uploads/                     # runtime file storage (photos, selfies)
│   ├── pending/
│   ├── person_issues/
│   ├── registered_faces/
│   ├── site_issues/
│   └── temp_selfies/
├── .gitattributes
├── .gitignore
├── BLOCKCHAIN_PLAN.md
├── docker-compose.yml
├── future_scope.md              # planned work beyond this submission
├── HACKATHON-FORM-ANSWERS.md
├── image copy.png
├── image.png
├── IMPLEMENTATION_PLAN_NEW.md
├── LandingPage_HEAD.txt
├── LandingPage_stash.tsx
├── package.json                 # root-level Docker/Hardhat helper scripts
├── README.md
└── SETUP.md                     # full local dev setup guide
```

### What goes where?

| Item | Location |
|---|---|
| Frontend source | `frontend/src/` |
| Backend API source | `backend/src/` |
| ML/AI microservice source | `ai_engine/src/` |
| Blockchain contract + anchoring service | `blockchain/contracts/`, `blockchain/src/` |
| Architecture / design documentation | `research/lld.md` |
| Final PPT / presentation | `submission/` |
| Local dev setup instructions | `SETUP.md` |

## 8. Final Presentation

See [submission/DeluluDevs_SIH2026.pdf](submission/DeluluDevs_SIH2026.pdf).

## 9. Demo Video

_Add the demo video link here before submission._

## 10. Screenshots / Prototype Photos

_Add product screenshots here before submission (e.g. under `assets/screenshots/`)._

## 11. Installation

```bash
git clone https://github.com/saumy-github/sih26.git
cd sih26

# copy env templates and fill in secrets — see SETUP.md for what each needs
cp backend/.env.example backend/.env
cp ai_engine/.env.example ai_engine/.env
cp blockchain/.env.example blockchain/.env
cp frontend/.env.example frontend/.env

cd frontend && npm install && cd ..
```

## 12. Run

```bash
# backend, ai_engine, blockchain, mongodb, redis, chromadb — via Docker Compose
npm run dev:up

# frontend — runs standalone, not containerized (separate terminal)
cd frontend && npm run dev
```

Full setup guide (prerequisites per OS, what goes in each `.env`, blockchain deployment): see [SETUP.md](SETUP.md).

## 13. Future Scope

See [future_scope.md](future_scope.md).
