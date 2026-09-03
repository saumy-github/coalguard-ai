FROM python:3.12-slim

# libgl1/libglib2.0-0: required by OpenCV/Ultralytics
# build-essential: required for building packages like chromadb/hnswlib
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Venv lives outside /app so it can't be shadowed by the src/data bind mounts,
# and so anyone who `docker compose exec`s in gets it active with no extra step.
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

WORKDIR /app

# Upgrade pip and packaging tools
RUN pip install --no-cache-dir --upgrade pip setuptools wheel

COPY requirements.txt .

# CPU-only PyTorch with standard PyPI fallback (--extra-index-url)
RUN pip install --no-cache-dir torch==2.3.0 torchvision==0.18.0 --extra-index-url https://download.pytorch.org/whl/cpu \
    && pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]


