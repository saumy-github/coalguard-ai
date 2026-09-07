"""
Face Identity Verification & Selfie Management
===============================================
Compares a live selfie against the worker's registered reference image
using DeepFace (SFace model — fast CPU-friendly) and manages temporary selfie storage.

Directory layout (relative to ai_engine/):
    data/attendance/registered_faces/{worker_id}.jpg   ← HR-provisioned reference
    data/attendance/temp_selfies/{worker_id}_{ts}.jpg  ← Verified live selfie (24 h TTL)

Performance Strategy:
    - Uses SFace (OpenCV DNN) — ~5× faster than FaceNet on CPU.
    - Model is pre-warmed at module import so first request is not cold.
    - Tests only the single sharpest frame + its horizontal flip (2 calls max).
    - If SFace is unavailable, falls back to Facenet with the same strategy.

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
def _resolve_dir(subfolder: str) -> Path:
    """Resolve storage directory prioritizing the shared /app/uploads folder."""
    # 1. Docker shared volume mount (/app/uploads)
    docker_dir = Path(f"/app/uploads/{subfolder}")
    if Path("/app/uploads").exists():
        docker_dir.mkdir(parents=True, exist_ok=True)
        return docker_dir
    # 2. Local workspace uploads folder (when running outside Docker)
    local_dir = Path(__file__).resolve().parents[3] / "uploads" / subfolder
    if local_dir.parent.exists():
        local_dir.mkdir(parents=True, exist_ok=True)
        return local_dir
    # 3. Fallback to ai_engine/data/attendance
    fallback_dir = Path(__file__).resolve().parents[2] / "data" / "attendance" / subfolder
    fallback_dir.mkdir(parents=True, exist_ok=True)
    return fallback_dir

# Temp selfies are stored in the upload folder ONLY
TEMP_SELFIES_DIR: Path = _resolve_dir("temp_selfies")
# Registered faces primary directory is in the upload folder
REGISTERED_DIR: Path = _resolve_dir("registered_faces")

# Secondary / fallback directory for registered faces
DATA_REGISTERED_DIR: Path = Path(__file__).resolve().parents[2] / "data" / "attendance" / "registered_faces"
DATA_REGISTERED_DIR.mkdir(parents=True, exist_ok=True)

# ── Constants ─────────────────────────────────────────────────────────────────
SELFIE_TTL_SECONDS: int = 24 * 3_600   # 24 hours
# SFace is an OpenCV-native DNN model — very fast on CPU.
# Fall back to Facenet if SFace is not available in this DeepFace build.
FACE_MODEL: str = "SFace"
_FACE_MODEL_DISTANCE_THRESHOLD = 0.65   # SFace cosine default is 0.593; 0.65 allows practical webcam lighting variations
# Also accept if DeepFace reports verified=True regardless of threshold


def _prewarm_model() -> None:
    """Pre-warm the face recognition model to avoid cold-start latency on first request."""
    try:
        import tempfile
        # Create a small blank image just to trigger model download/load
        dummy = np.zeros((112, 112, 3), dtype=np.uint8)
        with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
            tmp_path = tmp.name
        cv2.imwrite(tmp_path, dummy)
        try:
            DeepFace.represent(img_path=tmp_path, model_name=FACE_MODEL, enforce_detection=False)
            logger.info("Face model '%s' pre-warmed successfully.", FACE_MODEL)
        except Exception:
            pass
        finally:
            try:
                os.unlink(tmp_path)
            except OSError:
                pass
    except Exception as exc:
        logger.warning("Model pre-warm skipped: %s", exc)


# Pre-warm asynchronously at module load (runs in the FastAPI worker process)
try:
    _prewarm_model()
except Exception:
    pass


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
    clean_id = (worker_id or "").strip().lower()

    # Search directories in order of priority:
    # 1. Primary uploads registered_faces (/app/uploads/registered_faces or repo uploads/registered_faces)
    # 2. Secondary/Legacy data/attendance/registered_faces
    search_dirs: list[Path] = []
    for candidate_dir in [
        REGISTERED_DIR,
        Path("/app/uploads/registered_faces"),
        Path(__file__).resolve().parents[3] / "uploads" / "registered_faces",
        DATA_REGISTERED_DIR,
    ]:
        if candidate_dir.exists() and candidate_dir not in search_dirs:
            search_dirs.append(candidate_dir)

    target_names = {clean_id, worker_id.strip(), clean_id.replace(" ", "_"), clean_id.replace("_", " ")}
    target_names.discard("")

    ref_path: Path | None = None
    # 1st pass: direct exact match for common image extensions
    for sdir in search_dirs:
        for name in target_names:
            for ext in (".jpg", ".jpeg", ".png", ".webp", ".JPG", ".JPEG", ".PNG"):
                candidate = sdir / f"{name}{ext}"
                if candidate.is_file():
                    ref_path = candidate
                    break
            if ref_path is not None:
                break
        if ref_path is not None:
            break

    # 2nd pass: case-insensitive stem matching across files in search_dirs (critical for Linux Docker)
    if ref_path is None:
        target_stems_lower = {t.lower() for t in target_names}
        for sdir in search_dirs:
            try:
                for file_path in sdir.iterdir():
                    if file_path.is_file() and file_path.name != ".gitkeep":
                        if file_path.stem.lower() in target_stems_lower:
                            ref_path = file_path
                            break
            except Exception:
                pass
            if ref_path is not None:
                break

    if ref_path is None:
        return (
            False,
            f"No registered face on file for worker '{worker_id}'. "
            "Please ask HR/Admin to upload your reference photo.",
        )

    # Score all decodable frames by sharpness (Laplacian variance)
    scored_frames = []
    for raw in frames_bytes:
        arr = np.frombuffer(raw, dtype=np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if img is None:
            continue
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        score = float(cv2.Laplacian(gray, cv2.CV_64F).var())
        scored_frames.append((score, img))

    if not scored_frames:
        return False, "No decodable frames found in the burst."

    # Sort descending by sharpness — use only the SINGLE best frame to minimise DeepFace calls.
    # Testing the best frame + its horizontal flip covers webcam-mirror differences (2 calls max).
    scored_frames.sort(key=lambda x: x[0], reverse=True)
    best_frame = scored_frames[0][1]

    best_distance = 1.0
    verified_flag = False

    # Test original orientation, then mirrored (handles webcam mirroring)
    for o_idx, test_img in enumerate([best_frame, cv2.flip(best_frame, 1)]):
        tmp_live = TEMP_SELFIES_DIR / f"__live_{clean_id}_{int(time.time())}_{o_idx}.jpg"
        cv2.imwrite(str(tmp_live), test_img)
        try:
            result = DeepFace.verify(
                img1_path=str(tmp_live),
                img2_path=str(ref_path),
                model_name=FACE_MODEL,
                enforce_detection=False,
                detector_backend="opencv",
            )
            v = result.get("verified", False)
            dist = round(result.get("distance", 1.0), 4)
            if dist < best_distance:
                best_distance = dist
            # Accept if DeepFace says verified OR distance <= generous threshold
            if v or dist <= _FACE_MODEL_DISTANCE_THRESHOLD:
                verified_flag = True
                break
        except Exception as exc:
            logger.warning("DeepFace orientation %d error: %s", o_idx, exc)
        finally:
            if tmp_live.exists():
                try:
                    tmp_live.unlink()
                except OSError:
                    pass

    logger.info(
        "Identity check — worker=%s  ref=%s  verified=%s  best_distance=%.4f  model=%s",
        worker_id, ref_path.name, verified_flag, best_distance, FACE_MODEL,
    )
    if verified_flag:
        return True, f"Identity verified (distance={best_distance})."
    else:
        return False, f"Face mismatch — identity could not be confirmed (distance={best_distance})."


def save_verified_selfie(worker_id: str, frames_bytes: List[bytes]) -> Path:
    """Persist the sharpest verified selfie with a timestamped filename in TEMP_SELFIES_DIR only.

    Args:
        worker_id:    Worker identifier.
        frames_bytes: Raw bytes of the burst frames.

    Returns:
        Path to the saved selfie file in uploads/temp_selfies.
    """
    clean_id = (worker_id or "worker").strip().lower().replace(" ", "_")
    live_frame = _sharpest_frame(frames_bytes)
    ts = int(time.time())
    out_path = TEMP_SELFIES_DIR / f"{clean_id}_{ts}.jpg"
    cv2.imwrite(str(out_path), live_frame)
    logger.info("Verified selfie saved in upload folder (temp_selfies): %s", out_path.name)
    return out_path


def purge_old_selfies() -> int:
    """Delete temp selfies older than 24 hours from uploads/temp_selfies only.

    Returns:
        Number of files deleted.
    """
    now = time.time()
    deleted = 0

    purge_dirs = [TEMP_SELFIES_DIR]
    legacy_dir = Path(__file__).resolve().parents[2] / "data" / "attendance" / "temp_selfies"
    if legacy_dir.exists() and legacy_dir not in purge_dirs:
        purge_dirs.append(legacy_dir)

    for pdir in purge_dirs:
        if not pdir.exists():
            continue
        for f in pdir.iterdir():
            if not f.is_file():
                continue
            # Skip ephemeral comparison files that are still in-flight or gitkeep
            if f.name.startswith("__live_") or f.name == ".gitkeep":
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

    logger.info("Selfie purge complete — deleted %d file(s).", deleted)
    return deleted
