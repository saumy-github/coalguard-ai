# syntax=docker/dockerfile:1
FROM python:3.12-slim

# No apt deps: every pinned requirement ships a cp312 wheel. The former
# build-essential block existed solely for web3's pinned lru-dict, and web3
# moved to the blockchain/ service (see blockchain/Dockerfile).

WORKDIR /app

# Install dependencies first for better Docker layer caching
COPY requirements.txt .
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install -r requirements.txt

# Copy the rest of the application code
COPY . .

# Run the application
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
