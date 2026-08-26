# syntax=docker/dockerfile:1
FROM python:3.12-slim

# libgl1/libglib2.0-0: required by OpenCV/Ultralytics
# build-essential: chroma-hnswlib (chromadb dep) has no cp312 wheel, needs to compile from source
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    build-essential

WORKDIR /app

COPY requirements.txt .

# CPU-only build: this container gets no GPU access from docker-compose, and most
# dev/deploy machines have no NVIDIA GPU. Saves ~1.5-2GB of unused CUDA libs.
# If GPU support is ever needed, drop this line and add torch back to requirements.txt.
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install torch==2.3.0 torchvision==0.18.0 --index-url https://download.pytorch.org/whl/cpu

RUN --mount=type=cache,target=/root/.cache/pip \
    pip install -r requirements.txt

COPY . .

CMD ["uvicorn", "src.server:app", "--host", "0.0.0.0", "--port", "8001"]
