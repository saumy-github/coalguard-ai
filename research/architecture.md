# Implementation Architecture & Deployment Strategy

This document outlines how we will implement the microservices architecture, containerize it using Docker, and deploy it cost-effectively for the hackathon.

## 1. System Architecture (Everything in Docker)

Instead of managing separate deployments for the database, cache, vector store, and backend, we will use **Docker Compose** to orchestrate everything as a unified microservices environment. 

### The Services
We will define the following services in a `docker-compose.yml` file:

1. **Backend API (`backend`)**: Python + FastAPI. Exposes the REST API and WebSockets.
2. **MongoDB (`mongodb`)**: The main database (using Beanie ODM in the backend).
3. **Redis (`redis`)**: Message broker for WebSockets and caching.
4. **ChromaDB (`chromadb`)**: Vector database for the RAG engine.
5. **n8n (`n8n`)**: Workflow automation engine for alerts and reports.

*Note: The React frontend will NOT be in this Docker setup for local development (to allow Vite's instant hot-reloading via `npm run dev`), but it can be containerized for production or deployed separately to Vercel.*

## 2. Local Development Workflow

For local development, you want zero friction. You shouldn't have to install MongoDB or Redis on your actual machine.

### `docker-compose.yml` (Development Setup)
```yaml
version: '3.8'

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    env_file:
      - ./backend/.env
    ports:
      - "8000:8000"
    volumes:
      - ./backend/src:/app/src  # Hot-reloads code inside Docker!
    command: ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
    restart: unless-stopped
    depends_on:
      - mongodb
      - redis
      - chromadb

  mongodb:
    image: mongo:7.0
    ports:
      - "27017:27017"           # Exposed so you can connect via MongoDB Compass
    volumes:
      - mongo_dev_data:/data/db
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"             # Exposed for Redis Insight GUI
    volumes:
      - redis_dev_data:/data
    restart: unless-stopped

  chromadb:
    image: chromadb/chroma:latest
    ports:
      - "8000:8000"             # Exposed to inspect vector embeddings
    volumes:
      - chroma_dev_data:/chroma/chroma
    restart: unless-stopped

volumes:
  mongo_dev_data:
  redis_dev_data:
  chroma_dev_data:
```

**Workflow:**
1. Run `docker-compose up -d`. This starts everything (Backend, MongoDB, Redis, Chroma).
2. Because of the `volumes` mapping (`./backend/src:/app/src`), any code changes you make in VS Code will instantly hot-reload the `uvicorn` server running *inside* the Docker container.
3. You can open MongoDB Compass and connect to `mongodb://localhost:27017` to view DB entries live.
4. In the `frontend` folder, just run `npm run dev` to start React.

## 3. Production Deployment Strategy

You asked how to run multiple microservices without paying for multiple Render instances. The answer is a **Single VPS (Virtual Private Server) running Docker Compose**. 

Instead of PaaS (Platform as a Service like Render where you pay per service), you get IaaS (Infrastructure as a Service - a raw Linux server). You install Docker, clone your repo, and run `docker-compose up -d`. All your microservices run inside that one server, sharing its RAM and CPU.

### Best Cloud Options for Hackathons (Free/Cheap)

Running MongoDB, ChromaDB, Redis, and Python requires RAM (at least 2GB, ideally 4GB+). Standard free tiers (AWS t2.micro, Google Cloud e2-micro) only give 1GB RAM, which will crash when ChromaDB loads.

Here are your best options:

#### Option A: Oracle Cloud "Always Free" (Highly Recommended)
- **What you get**: Up to 2 OCPUs and 12 GB RAM (ARM Ampere A1 instance) completely free forever.
- **Why it's great**: 12GB of RAM is massive for a free tier. It easily runs all your Docker containers at once.
- **Catch**: High demand means it can sometimes be hard to provision in certain regions (try Frankfurt or Singapore). You also need to ensure your Docker images support ARM64 architecture (most do nowadays).

#### Option B: GitHub Student Developer Pack (Azure / AWS)
*(Note: DigitalOcean recently ended its GitHub Student Pack credits in 2026).*
- **Microsoft Azure**: Students get **$100 in free Azure credits** (no credit card required). You can use this to spin up a beefy Azure Virtual Machine (e.g., 4GB RAM) for the duration of the hackathon.
- **AWS Educate / AWS Activate**: Sometimes offers credits for startups/students. 

#### Option C: Ultra-Cheap VPS (If free fails)
If you can't get Oracle or Student credits, don't use Render. Use a cheap VPS provider:
- **Hetzner**: ~$4/month for 2 vCPU / 4GB RAM.
- **Contabo**: ~$6/month for 4 vCPU / 6GB RAM.
*These are infinitely cheaper than running 5 services on Render.*

### Production `docker-compose.prod.yml`
In production, your backend is also containerized.

```yaml
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "8080:8080"
    environment:
      - MONGO_URL=mongodb://mongodb:27017/coalmine
      - REDIS_URL=redis://redis:6379
      - CHROMA_URL=http://chromadb:8000
    depends_on:
      - mongodb
      - redis
      - chromadb

  mongodb:
    image: mongo:7.0
    volumes:
      - prod_mongo_data:/data/db

  redis:
    image: redis:7-alpine

  chromadb:
    image: chromadb/chroma:latest
    volumes:
      - prod_chroma_data:/chroma/chroma

volumes:
  prod_mongo_data:
  prod_chroma_data:
```

### The Setup Steps (Production)
1. Provision the Linux VPS (Ubuntu 24.04).
2. Install Docker and Docker Compose.
3. Git clone your repository.
4. Run `docker-compose -f docker-compose.prod.yml up -d --build`.
5. Install Nginx (optional but recommended) on the VPS to route port 80/443 to your FastAPI port (8080).
6. (Frontend) Deploy the React/Vite app to **Vercel** for free. Point its API base URL to your VPS IP/Domain.

## 4. Summary of Tech Stack Choices

Based on our discussion, the final stack is locked in:

- **Backend**: Python + FastAPI
- **Database**: MongoDB (via **Beanie** Async ODM)
- **Cache / PubSub**: Redis
- **Vector DB**: ChromaDB
- **State Management (Frontend)**: Zustand
- **Charts**: Apache ECharts
- **AI/LLM**: Cloud APIs (Groq/OpenAI) during intense testing to save time; switch to Ollama (local in Docker) or preserve credits for the final presentation.
- **Hosting**: Everything (except frontend) runs via Docker Compose on a single VPS (Oracle Free Tier or Azure Student Credits). Frontend on Vercel.
