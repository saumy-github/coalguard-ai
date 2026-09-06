"""
AI Engine — FastAPI Gateway
=============================
Central API server for the Smart Governance & Compliance Monitoring System.
Exposes endpoints for PPE detection, sensor anomaly assessment, production
forecasting, regulatory compliance analysis, and geo-fenced face attendance.

Endpoints:
    GET  /health                       → System health & module readiness
    POST /api/cv/detect                → Image upload → PPE detection
    POST /api/predictive/anomaly       → Telemetry JSON → anomaly report
    POST /api/predictive/forecast      → Production history → 30-day forecast
    POST /api/rag/check-compliance     → Text observation → legal analysis
    POST /api/attendance/mark          → Multi-frame burst → geo-fenced attendance
"""

from __future__ import annotations

import logging
import traceback
from dataclasses import asdict
from pathlib import Path
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv
from fastapi import BackgroundTasks, FastAPI, File, Form, HTTPException, UploadFile
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
        "production forecasting, regulatory compliance analysis, "
        "and geo-fenced face attendance."
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

    # Attendance module
    try:
        from src.attendance.face_verify import REGISTERED_DIR, TEMP_SELFIES_DIR
        modules["attendance_engine"] = {
            "ready": True,
            "registered_faces_dir": str(REGISTERED_DIR),
            "temp_selfies_dir": str(TEMP_SELFIES_DIR),
        }
    except Exception as exc:
        modules["attendance_engine"] = {"ready": False, "error": str(exc)}

    all_ready = True
    for key, m in modules.items():
        if isinstance(m, dict):
            if "ready" in m:
                if not m["ready"]:
                    all_ready = False
            else:
                # For modules like rag_engine that return multiple bool flags
                if not all(v for v in m.values() if isinstance(v, bool)):
                    all_ready = False
        else:
            all_ready = False

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
        raise HTTPException(status_code=500, detail=f"Detection failed: {exc}")


# ══════════════════════════════════════════════════════════════════════════════
# PREDICTIVE ANALYTICS — ANOMALY DETECTION
# ══════════════════════════════════════════════════════════════════════════════

class TelemetryInput(BaseModel):
    """Input schema for sensor anomaly detection."""
    methane: float = Field(..., ge=0, description="Methane concentration (%CH4).")
    co: float = Field(..., ge=0, description="Carbon monoxide concentration (ppm).")
    air_velocity: float = Field(..., ge=0, description="Air velocity (m/s).")
    temperature: float = Field(..., description="Temperature (°C).")


@app.post("/api/predictive/anomaly", tags=["Predictive Analytics"])
async def predictive_anomaly(payload: TelemetryInput) -> Dict[str, Any]:
    """Accept telemetry readings and return an anomaly assessment."""
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
        raise HTTPException(status_code=500, detail=f"Anomaly detection failed: {exc}")


# ══════════════════════════════════════════════════════════════════════════════
# PREDICTIVE ANALYTICS — PRODUCTION FORECASTING
# ══════════════════════════════════════════════════════════════════════════════

class ProductionEntry(BaseModel):
    """A single day of production data."""
    date: str = Field(..., description="ISO-8601 date string (YYYY-MM-DD).")
    production_tonnes: float = Field(..., ge=0, description="Daily extraction in tonnes.")


class ForecastInput(BaseModel):
    """Input schema for production forecasting."""
    history: List[ProductionEntry] = Field(
        ..., min_length=2, description="Historical daily production records (minimum 2).",
    )
    ec_cap_tonnes: float = Field(..., gt=0, description="Environmental Clearance cap in tonnes.")
    forecast_days: int = Field(default=30, ge=1, le=365, description="Days to forecast (default: 30).")


@app.post("/api/predictive/forecast", tags=["Predictive Analytics"])
async def predictive_forecast(payload: ForecastInput) -> Dict[str, Any]:
    """Accept production history and EC cap, return a 30-day forecast."""
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
        raise HTTPException(status_code=500, detail=f"Forecast failed: {exc}")


# ══════════════════════════════════════════════════════════════════════════════
# RAG — COMPLIANCE CHECK
# ══════════════════════════════════════════════════════════════════════════════

class ComplianceInput(BaseModel):
    """Input schema for compliance checking."""
    observation: str = Field(
        ...,
        min_length=5,
        description="Free-text field observation to check against regulations.",
    )


@app.post("/api/rag/check-compliance", tags=["RAG Compliance"])
async def rag_check_compliance(payload: ComplianceInput) -> Dict[str, Any]:
    """Accept a text observation and return statutory legal analysis with citations."""
    from src.rag_engine import check_compliance

    try:
        result = check_compliance(observation=payload.observation)
        return asdict(result)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except EnvironmentError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception as exc:
        logger.error("Compliance check failed: %s", traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Compliance check failed: {exc}")


# ══════════════════════════════════════════════════════════════════════════════
# ATTENDANCE — GEO-FENCED FACE ATTENDANCE
# ══════════════════════════════════════════════════════════════════════════════

@app.post("/api/attendance/mark", tags=["Attendance"])
async def attendance_mark(
    background_tasks: BackgroundTasks,
    worker_id: str = Form(..., description="Unique worker identifier."),
    latitude: float = Form(..., description="Worker's current GPS latitude."),
    longitude: float = Form(..., description="Worker's current GPS longitude."),
    site_lat: float = Form(..., description="Mine site GPS latitude."),
    site_lon: float = Form(..., description="Mine site GPS longitude."),
    files: List[UploadFile] = File(
        ...,
        description="Multi-frame image burst (2–5 JPEG/PNG frames) for liveness detection.",
    ),
) -> Dict[str, Any]:
    """Mark attendance with geo-fencing, liveness detection, and face verification.

    Pipeline:
        1. Haversine geofence check (≤ 100 m from site).
        2. MediaPipe EAR blink detection across the frame burst.
        3. DeepFace FaceNet identity match against the registered reference photo.
        4. Save verified selfie; schedule 24 h cleanup as a background task.

    Raises:
        403  — Worker is outside the 100 m geofence.
        401  — Liveness check failed (no blink detected).
        401  — Face identity could not be verified.
        400  — Missing registered reference photo or insufficient frames.
        500  — Unexpected inference error.
    """
    from src.attendance.face_verify import purge_old_selfies, save_verified_selfie, verify_identity
    from src.attendance.geofence import is_within_geofence
    from src.attendance.liveness import detect_blink

    # ── Step 1: Geofence check ────────────────────────────────────────────────
    within_fence, distance_m = is_within_geofence(latitude, longitude, site_lat, site_lon)
    if not within_fence:
        logger.warning(
            "Attendance denied — worker=%s is %.1f m from site (limit=100 m).",
            worker_id, distance_m,
        )
        raise HTTPException(
            status_code=403,
            detail=(
                f"You are {distance_m} m from the mine site. "
                "Attendance can only be marked within 100 m of the site boundary."
            ),
        )

    # ── Read all frames into memory ───────────────────────────────────────────
    frames: List[bytes] = []
    for upload in files:
        raw = await upload.read()
        if raw:
            frames.append(raw)

    if len(frames) < 2:
        raise HTTPException(
            status_code=400,
            detail="At least 2 image frames are required for liveness detection.",
        )

    # ── Step 2: Liveness / anti-spoofing ─────────────────────────────────────
    try:
        liveness_ok, liveness_msg = detect_blink(frames)
    except Exception as exc:
        logger.error("Liveness detection error: %s", traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Liveness check error: {exc}")

    if not liveness_ok:
        logger.warning("Attendance denied — liveness failed for worker=%s: %s", worker_id, liveness_msg)
        raise HTTPException(status_code=401, detail=f"Liveness check failed: {liveness_msg}")

    # ── Step 3: Face identity verification ───────────────────────────────────
    try:
        verified, verify_msg = verify_identity(worker_id=worker_id, frames_bytes=frames)
    except Exception as exc:
        logger.error("Face verification error: %s", traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Face verification error: {exc}")

    if not verified:
        logger.warning("Attendance denied — face mismatch for worker=%s: %s", worker_id, verify_msg)
        raise HTTPException(status_code=401, detail=f"Identity verification failed: {verify_msg}")

    # ── Step 4: Save selfie & schedule cleanup ────────────────────────────────
    try:
        selfie_path = save_verified_selfie(worker_id=worker_id, frames_bytes=frames)
    except Exception as exc:
        logger.error("Selfie save error: %s", traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Could not save verified selfie: {exc}")

    background_tasks.add_task(purge_old_selfies)

    logger.info(
        "Attendance marked — worker=%s  distance=%.1f m  selfie=%s",
        worker_id, distance_m, selfie_path.name,
    )

    return {
        "status": "success",
        "worker_id": worker_id,
        "distance_from_site_m": distance_m,
        "liveness": liveness_msg,
        "identity": verify_msg,
        "selfie_saved": selfie_path.name,
        "message": "Attendance marked successfully.",
    }


@app.post("/api/attendance/register-face", tags=["Attendance"])
async def register_face(
    worker_id: str = Form(..., description="Unique worker ID (e.g. 'saumy', 'worker_001')."),
    file: UploadFile = File(..., description="Reference face photo (.jpg, .jpeg, .png)."),
) -> Dict[str, Any]:
    """Upload and register a worker's reference facial photo."""
    from src.attendance.face_verify import REGISTERED_DIR

    clean_id = worker_id.strip().lower()
    if not clean_id:
        raise HTTPException(status_code=400, detail="Worker ID cannot be empty.")

    # Determine file extension
    filename = file.filename or ""
    ext = os.path.splitext(filename)[1].lower()
    if ext not in [".jpg", ".jpeg", ".png"]:
        ext = ".jpg"

    target_path = REGISTERED_DIR / f"{clean_id}{ext}"
    try:
        content = await file.read()
        if not content:
            raise HTTPException(status_code=400, detail="Uploaded file is empty.")
        with open(target_path, "wb") as f:
            f.write(content)
        logger.info("Registered face photo for worker=%s saved to %s", clean_id, target_path)
    except Exception as exc:
        logger.error("Failed to save reference photo for %s: %s", clean_id, exc)
        raise HTTPException(status_code=500, detail=f"Failed to save reference photo: {exc}")

    return {
        "status": "success",
        "worker_id": clean_id,
        "filename": target_path.name,
        "message": f"Reference face photo registered for worker '{clean_id}'.",
    }
