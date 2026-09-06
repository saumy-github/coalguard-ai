FROM python:3.10-slim

# System deps:
#   libgl1, libglib2.0-0    — OpenCV / Ultralytics / MediaPipe
#   libgl1-mesa-glx         — MediaPipe OpenGL ES backend
#   libgomp1                — PyTorch / ONNX multi-threading
#   build-essential         — compile hnswlib (chromadb) + mediapipe native ext
#   libssl-dev              — some pip wheel TLS fallbacks
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    libgomp1 \
    build-essential \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Venv lives outside /app so it can't be shadowed by bind-mount volumes.
# Anyone who `docker compose exec`s in gets it active with no extra step.
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

WORKDIR /app

# Upgrade pip & wheel tools first
RUN pip install --no-cache-dir --upgrade pip setuptools wheel

COPY requirements.txt .

# 1. CPU-only PyTorch (saves ~2 GB vs CUDA bundle)
# 2. All remaining requirements
RUN pip install --no-cache-dir torch==2.3.0 torchvision==0.18.0 \
        --extra-index-url https://download.pytorch.org/whl/cpu \
    && pip install --no-cache-dir -r requirements.txt

COPY . .

# Pre-create attendance data directories so the container never fails on a
# missing path before Docker volumes are mounted at runtime.
RUN mkdir -p /app/data/attendance/registered_faces \
             /app/data/attendance/temp_selfies

EXPOSE 8000

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
