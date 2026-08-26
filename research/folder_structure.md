# Monorepo Folder Structure

For a complex project like this with Web, AI, and Automation components, a **Monorepo** (one single Git repository containing all parts of the project) is the best approach. 

Here is the ideal folder structure designed specifically for your stack, keeping dependencies clean and Docker builds fast.

```text
sih26/
├── frontend/                   # React, Vite, Tailwind App
│   ├── public/
│   ├── src/
│   │   ├── components/         # UI components (shadcn)
│   │   ├── pages/              # Dashboard, Map, Settings
│   │   ├── store/              # Zustand state
│   │   └── App.jsx
│   └── package.json            # Frontend dependencies
│
├── backend/                    # Core FastAPI Server (Lightweight)
│   ├── Dockerfile
│   ├── requirements.txt        # fastapi, beanie, redis, web3 (EXACT VERSIONS)
│   └── src/
│       ├── controllers/        # API Routes logic
│       ├── models/             # Beanie DB Schemas
│       ├── services/           # Business logic (Auth, Users, Tickets)
│       ├── websockets/         # Telemetry simulators and broadcasters
│       └── main.py             # App entrypoint
│
├── ai_engine/                  # Heavy ML Microservice (YOLO, RAG, OCR)
│   ├── Dockerfile
│   ├── requirements.txt        # torch, ultralytics, langchain, chromadb (EXACT VERSIONS)
│   └── src/
│       ├── cv_scanner/         # YOLOv8 PPE Detection
│       ├── rag_compliance/     # ChromaDB + LangChain logic
│       ├── ocr_processor/      # EasyOCR scripts
│       └── server.py           # A separate small FastAPI app just for AI tasks
│
├── n8n/                        # Automation Workflows
│   └── workflows/              # Exported n8n workflow .json files for version control
│
├── blockchain/                 # Hardhat + Solidity Smart Contracts
│   ├── contracts/              # CoalMineAudit.sol
│   ├── scripts/                # deploy.js
│   ├── test/                   # Smart contract tests
│   └── hardhat.config.js       # Hardhat configuration
│
├── docker-compose.yml          # Local Development infrastructure (DBs, Redis, Chroma)
├── docker-compose.prod.yml     # Production (Runs backend + ai_engine + infra)
└── README.md
```

## Why separate `backend` and `ai_engine`?

You asked if you should keep the ML side separate. **Yes, you absolutely should.**

If you put Computer Vision (YOLOv8 + PyTorch) and RAG (LangChain + ChromaDB) into the same `requirements.txt` as your main Web Backend, you will face massive problems:
1. **Bloated Docker Image:** PyTorch and ML libraries are huge (3GB+). Your web server should be tiny and fast.
2. **Build Times:** Changing a simple API route would force Docker to re-evaluate the massive ML dependencies.
3. **Blocking the Event Loop:** YOLO inference or LLM generation is CPU-heavy. If it runs in the main backend, it will freeze your WebSockets and API requests while it processes an image.

**The Solution:** The `backend` handles users, database, and WebSockets. When an image needs scanning or a legal rule needs checking, the `backend` sends an HTTP request or a Redis message to the `ai_engine` service.

## Where do the other pieces go?

- **Blockchain:** Since you are using Solidity and a local Hardhat testing environment (similar to your NeelKadam project), this gets its own root folder (`blockchain/`). Your backend will use the `web3.py` library to communicate with these deployed smart contracts.
- **n8n:** You do not write code for n8n. n8n is a pre-built tool that you run via Docker. You build workflows visually in the browser. You just need an `n8n/` folder in your repo to save the exported `.json` workflow files so your team doesn't lose them.
- **RAG & CV:** Go into the `ai_engine` folder.

## Best Practices for `requirements.txt`

As you mentioned, exact versions are critical. Never just write `fastapi` or `langchain`. 
Always use:
```text
fastapi==0.111.0
uvicorn==0.30.1
beanie==1.26.0
motor==3.4.0
```
*(Tip: Use `pip freeze > requirements.txt` to lock exact versions when developing).*
