# syntax=docker/dockerfile:1
FROM python:3.12-slim

# build-essential: web3's pinned lru-dict has no cp312 wheel, needs to compile
# from source. This block used to live in backend/Dockerfile for exactly this
# reason; web3 lives here now, so the apt install came with it.
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    apt-get update && apt-get install -y build-essential

WORKDIR /app

# Install dependencies first for better Docker layer caching
COPY requirements.txt .
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install -r requirements.txt

# The runtime image is Python-only — no Node. The contract ABI is committed at
# abi/AuditLedger.json and the deployed address at deployments/sepolia.json, so
# a fresh clone runs this service with no Hardhat and no npm install anywhere.
COPY . .

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
