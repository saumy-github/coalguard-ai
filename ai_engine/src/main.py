"""
AI Engine — FastAPI Gateway
=============================
Central API server for the Smart Governance & Compliance Monitoring System.
Exposes endpoints for PPE detection, sensor anomaly assessment, production
forecasting, and RAG-based compliance checking.

Endpoints:
    GET  /health                   → System health & module readiness
    POST /api/cv/detect            → Image upload → PPE detection
    POST /api/predictive/anomaly   → Telemetry JSON → anomaly report
    POST /api/predictive/forecast  → Production history → 30-day forecast
    POST /api/rag/check-compliance → Text observation → legal analysis
"""

from __future__ import annotations

import logging
import os
import traceback
from dataclasses import asdict
from pathlib import Path
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# ── Load .env from project root (ai_engine/.env) ─────────────────────────────
_env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(_env_path)

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s │ %(levelname)-8s │ %(name)s │ %(message)s",
)
logger = logging.getLogger("ai_engine")

# ── App Initialisation ───────────────────────────────────────────────────────
app = FastAPI(
    title="CoalGuard AI Engine",
    description=(
        "ML micro-service for PPE detection, sensor anomaly monitoring, "
        "production forecasting, and regulatory compliance analysis."
    ),
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ══════════════════════════════════════════════════════════════════════════════
# HEALTH CHECK
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/health", tags=["System"])
async def health_check() -> Dict[str, Any]:
    """Return system health and per-module readiness status."""
    modules: Dict[str, Any] = {}

    # CV module
    try:
        from src.cv_engine import is_model_ready
        modules["cv_engine"] = {"ready": is_model_ready()}
    except Exception as exc:
        modules["cv_engine"] = {"ready": False, "error": str(exc)}

    # Predictive module — always ready (IsolationForest is self-bootstrapping)
    modules["predictive_engine"] = {"ready": True}

    # RAG module
    try:
        from src.rag_engine import is_ready
        modules["rag_engine"] = is_ready()
    except Exception as exc:
        modules["rag_engine"] = {"ready": False, "error": str(exc)}

    all_ready = all(
        (m.get("ready", False) if isinstance(m, dict) else False)
        for m in modules.values()
    )

    return {
        "status": "healthy" if all_ready else "degraded",
        "modules": modules,
    }


# ══════════════════════════════════════════════════════════════════════════════
# COMPUTER VISION — PPE DETECTION
# ══════════════════════════════════════════════════════════════════════════════

@app.post("/api/cv/detect", tags=["Computer Vision"])
async def cv_detect(
    file: UploadFile = File(..., description="JPEG or PNG image of the work site."),
    confidence: float = 0.25,
) -> Dict[str, Any]:
    """Accept an image upload and return PPE detection results.

    Returns bounding boxes for helmets and reflective jackets, counts,
    and a ``violation_detected`` flag.
    """
    from src.cv_engine import detect

    # Validate content type
    if file.content_type and not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail=f"Expected an image file, got {file.content_type}.",
        )

    try:
        image_bytes = await file.read()
        if not image_bytes:
            raise HTTPException(status_code=400, detail="Uploaded file is empty.")

        result = detect(image_bytes, confidence_threshold=confidence)
        return asdict(result)

    except HTTPException:
        raise
    except Exception as exc:
        logger.error("CV detection failed: %s", traceback.format_exc())
        raise HTTPException(
            status_code=500,
            detail=f"Detection failed: {exc}",
        )


# ══════════════════════════════════════════════════════════════════════════════
# PREDICTIVE ANALYTICS — ANOMALY DETECTION
# ══════════════════════════════════════════════════════════════════════════════

class TelemetryInput(BaseModel):
    """Input schema for sensor anomaly detection."""

    methane: float = Field(
        ..., ge=0, description="Methane concentration (%CH4)."
    )
    co: float = Field(
        ..., ge=0, description="Carbon monoxide concentration (ppm)."
    )
    air_velocity: float = Field(
        ..., ge=0, description="Air velocity (m/s)."
    )
    temperature: float = Field(
        ..., description="Temperature (°C)."
    )


@app.post("/api/predictive/anomaly", tags=["Predictive Analytics"])
async def predictive_anomaly(payload: TelemetryInput) -> Dict[str, Any]:
    """Accept telemetry readings and return an anomaly assessment.

    Combines per-sensor regulatory threshold checks with an
    IsolationForest statistical outlier score.
    """
    from src.predictive_engine import assess_anomaly

    try:
        report = assess_anomaly(
            methane=payload.methane,
            co=payload.co,
            air_velocity=payload.air_velocity,
            temperature=payload.temperature,
        )
        return asdict(report)

    except Exception as exc:
        logger.error("Anomaly detection failed: %s", traceback.format_exc())
        raise HTTPException(
            status_code=500,
            detail=f"Anomaly detection failed: {exc}",
        )


# ══════════════════════════════════════════════════════════════════════════════
# PREDICTIVE ANALYTICS — PRODUCTION FORECASTING
# ══════════════════════════════════════════════════════════════════════════════

class ProductionEntry(BaseModel):
    """A single day of production data."""

    date: str = Field(
        ..., description="ISO-8601 date string (YYYY-MM-DD)."
    )
    production_tonnes: float = Field(
        ..., ge=0, description="Daily extraction in tonnes."
    )


class ForecastInput(BaseModel):
    """Input schema for production forecasting."""

    history: List[ProductionEntry] = Field(
        ...,
        min_length=2,
        description="Historical daily production records (minimum 2).",
    )
    ec_cap_tonnes: float = Field(
        ...,
        gt=0,
        description="Environmental Clearance cap in tonnes.",
    )
    forecast_days: int = Field(
        default=30,
        ge=1,
        le=365,
        description="Number of days to forecast (default: 30).",
    )


@app.post("/api/predictive/forecast", tags=["Predictive Analytics"])
async def predictive_forecast(payload: ForecastInput) -> Dict[str, Any]:
    """Accept production history and EC cap, return a 30-day forecast
    with compliance status.
    """
    from src.predictive_engine import forecast_production

    try:
        history = [entry.model_dump() for entry in payload.history]
        result = forecast_production(
            history=history,
            ec_cap_tonnes=payload.ec_cap_tonnes,
            forecast_days=payload.forecast_days,
        )
        return asdict(result)

    except Exception as exc:
        logger.error("Forecast failed: %s", traceback.format_exc())
        raise HTTPException(
            status_code=500,
            detail=f"Forecast failed: {exc}",
        )


# ══════════════════════════════════════════════════════════════════════════════
# RAG — COMPLIANCE CHECK
# ══════════════════════════════════════════════════════════════════════════════

class ComplianceInput(BaseModel):
    """Input schema for compliance checking."""

    observation: str = Field(
        ...,
        min_length=5,
        description=(
            "Free-text field observation to check against regulations "
            "(e.g., 'Workers in Zone B not wearing safety helmets')."
        ),
    )


@app.post("/api/rag/check-compliance", tags=["RAG Compliance"])
async def rag_check_compliance(payload: ComplianceInput) -> Dict[str, Any]:
    """Accept a text observation and return statutory legal analysis
    with citations from the regulatory corpus.
    """
    from src.rag_engine import check_compliance

    try:
        result = check_compliance(observation=payload.observation)
        return asdict(result)

    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=503,
            detail=str(exc),
        )
    except EnvironmentError as exc:
        raise HTTPException(
            status_code=503,
            detail=str(exc),
        )
    except Exception as exc:
        logger.error("Compliance check failed: %s", traceback.format_exc())
        raise HTTPException(
            status_code=500,
            detail=f"Compliance check failed: {exc}",
        )
