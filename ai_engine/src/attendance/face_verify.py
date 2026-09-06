"""
Face Identity Verification & Selfie Management
===============================================
Compares a live selfie against the worker's registered reference image
using DeepFace (FaceNet model) and manages temporary selfie storage.

Directory layout (relative to ai_engine/):
    data/attendance/registered_faces/{worker_id}.jpg   ← HR-provisioned reference
    data/attendance/temp_selfies/{worker_id}_{ts}.jpg  ← Verified live selfie (24 h TTL)

Selfie Purging:
    purge_old_selfies() deletes any temp selfie whose mtime is older than 24 hours.
    It is called as a FastAPI BackgroundTask after every successful attendance mark.
"""

from __future__ import annotations

import logging
import os
import time
from pathlib import Path
from typing import List

import cv2
import numpy as np
from deepface import DeepFace

logger = logging.getLogger(__name__)

# ── Storage paths ─────────────────────────────────────────────────────────────
_BASE = Path(__file__).resolve().parent.parent.parent / "data" / "attendance"
REGISTERED_DIR: Path = _BASE / "registered_faces"
TEMP_SELFIES_DIR: Path = _BASE / "temp_selfies"

# Ensure directories exist at import time (critical for Docker volumes)
REGISTERED_DIR.mkdir(parents=True, exist_ok=True)
TEMP_SELFIES_DIR.mkdir(parents=True, exist_ok=True)

# ── Constants ─────────────────────────────────────────────────────────────────
SELFIE_TTL_SECONDS: int = 24 * 3_600   # 24 hours
FACE_MODEL: str = "Facenet"


def _sharpest_frame(frames_bytes: List[bytes]) -> np.ndarray:
    """Return the sharpest frame (highest Laplacian variance) from the burst."""
    best_frame: np.ndarray | None = None
    best_score: float = -1.0

    for raw in frames_bytes:
        arr = np.frombuffer(raw, dtype=np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if img is None:
            continue
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        score = float(cv2.Laplacian(gray, cv2.CV_64F).var())
        if score > best_score:
            best_score = score
            best_frame = img

    if best_frame is None:
        raise ValueError("No decodable frames found in the burst.")
    return best_frame


def verify_identity(
    worker_id: str,
    frames_bytes: List[bytes],
) -> tuple[bool, str]:
    """Verify the live selfie against the worker's registered ID image.

    Args:
        worker_id:     Worker identifier (used to locate registered photo).
        frames_bytes:  Raw bytes of every frame in the burst.

    Returns:
        Tuple of (verified: bool, message: str).
    """
    # Accept .jpg, .jpeg, or .png — whichever was uploaded by HR
    ref_path = None
    for ext in (".jpg", ".jpeg", ".png"):
        candidate = REGISTERED_DIR / f"{worker_id}{ext}"
        if candidate.exists():
            ref_path = candidate
            break

    if ref_path is None:
        return (
            False,
            f"No registered face on file for worker '{worker_id}'. "
            "Please ask HR to upload your reference photo.",
        )

    live_frame = _sharpest_frame(frames_bytes)

    # Write live frame to a temp path so DeepFace can accept it as a file path
    tmp_live = TEMP_SELFIES_DIR / f"__live_{worker_id}_{int(time.time())}.jpg"
    cv2.imwrite(str(tmp_live), live_frame)

    try:
        result = DeepFace.verify(
            img1_path=str(tmp_live),
            img2_path=str(ref_path),
            model_name=FACE_MODEL,
            enforce_detection=True,
            detector_backend="opencv",
        )
        verified: bool = result.get("verified", False)
        distance: float = round(result.get("distance", 1.0), 4)

        logger.info(
            "Identity check — worker=%s  verified=%s  distance=%.4f",
            worker_id, verified, distance,
        )
        if verified:
            return True, f"Identity verified (distance={distance})."
        else:
            return False, f"Face mismatch — identity could not be confirmed (distance={distance})."

    except Exception as exc:
        logger.warning("DeepFace verification error: %s", exc)
        return False, f"Face verification error: {exc}"

    finally:
        # Always clean up the ephemeral comparison file
        if tmp_live.exists():
            tmp_live.unlink()


def save_verified_selfie(worker_id: str, frames_bytes: List[bytes]) -> Path:
    """Persist the sharpest verified selfie with a timestamped filename.

    Args:
        worker_id:    Worker identifier.
        frames_bytes: Raw bytes of the burst frames.

    Returns:
        Path to the saved selfie file.
    """
    live_frame = _sharpest_frame(frames_bytes)
    ts = int(time.time())
    out_path = TEMP_SELFIES_DIR / f"{worker_id}_{ts}.jpg"
    cv2.imwrite(str(out_path), live_frame)
    logger.info("Verified selfie saved: %s", out_path.name)
    return out_path


def purge_old_selfies() -> int:
    """Delete temp selfies older than 24 hours.

    Returns:
        Number of files deleted.
    """
    now = time.time()
    deleted = 0
    for f in TEMP_SELFIES_DIR.iterdir():
        if not f.is_file():
            continue
        # Skip ephemeral comparison files that are still in-flight
        if f.name.startswith("__live_"):
            continue
        age = now - f.stat().st_mtime
        if age > SELFIE_TTL_SECONDS:
            try:
                f.unlink()
                deleted += 1
                logger.debug("Purged expired selfie: %s (age=%.0fs)", f.name, age)
            except OSError as err:
                logger.warning("Could not delete %s: %s", f.name, err)

    logger.info("Selfie purge complete — deleted %d file(s).", deleted)
    return deleted
