from typing import Any

import httpx

from ..config import settings


async def detect_ppe(image_bytes: bytes) -> dict[str, Any]:
    async with httpx.AsyncClient(base_url=settings.ai_engine_url, timeout=30.0) as client:
        response = await client.post(
            "/api/cv/detect",
            files={"file": ("image.jpg", image_bytes, "image/jpeg")},
        )
        response.raise_for_status()
        return response.json()


async def check_anomaly(*, methane: float, co: float, air_velocity: float, temperature: float) -> dict[str, Any]:
    async with httpx.AsyncClient(base_url=settings.ai_engine_url, timeout=30.0) as client:
        response = await client.post(
            "/api/predictive/anomaly",
            json={
                "methane": methane,
                "co": co,
                "air_velocity": air_velocity,
                "temperature": temperature,
            },
        )
        response.raise_for_status()
        return response.json()


async def classify_issue(observation: str) -> dict[str, Any]:
    async with httpx.AsyncClient(base_url=settings.ai_engine_url, timeout=30.0) as client:
        response = await client.post(
            "/api/issues/classify",
            json={"observation": observation},
        )
        response.raise_for_status()
        return response.json()


async def mark_attendance(files: list[tuple[str, bytes, str]]) -> dict[str, Any]:
    """Send camera burst frames to the AI engine for liveness check and 1-to-N
    face identification. Returns the full AI engine response dict, which must
    include a 'worker_id' key containing the matched MongoDB ObjectId string."""
    multipart = [("files", (name, data, ct)) for name, data, ct in files]
    async with httpx.AsyncClient(base_url=settings.ai_engine_url, timeout=120.0) as client:
        response = await client.post("/api/attendance/mark", files=multipart)
        response.raise_for_status()
        return response.json()
