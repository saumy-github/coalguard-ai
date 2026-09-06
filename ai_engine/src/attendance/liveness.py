"""
Liveness Detection via Eye-Aspect-Ratio (EAR) Blink Analysis
=============================================================
Uses MediaPipe Face Mesh to process a sequence of image frames and detect
a genuine human blink by tracking the Eye Aspect Ratio across the burst.

Algorithm
---------
1. For every frame: extract 6 landmark coordinates per eye.
2. Compute EAR = (||p2-p6|| + ||p3-p5||) / (2 * ||p1-p4||)   (Soukupova formula)
3. Use ADAPTIVE thresholds derived from the sequence's own EAR range — this
   makes the detector robust to glasses, lighting, and face distance.
4. A blink is confirmed when:
     a) EAR drops below  (max_ear * BLINK_RATIO)  in at least one frame, AND
     b) Another frame has EAR above (max_ear * OPEN_RATIO)
   This covers glasses wearers, dark frames, and partially occluded eyes.

Fallback
--------
   If peak EAR is too low for reliable classification (e.g. very dark / blurry),
   fall back to checking whether the EAR variance across the burst exceeds a
   minimum threshold — any significant eye movement counts as a liveness signal.

MediaPipe landmark indices (468-point mesh):
    Left  eye : 33, 160, 158, 133, 153, 144
    Right eye : 362, 385, 387, 263, 373, 380
"""

from __future__ import annotations

import logging
import math
from typing import List, Sequence

import cv2
import mediapipe as mp
import numpy as np

logger = logging.getLogger(__name__)

# ── Adaptive blink detection ratios ──────────────────────────────────────────
# A frame is "closed" if its EAR < max_ear * BLINK_RATIO
BLINK_RATIO: float = 0.75
# A frame is "open"   if its EAR > max_ear * OPEN_RATIO
OPEN_RATIO:  float = 0.85
# Minimum absolute EAR variance across the burst (glasses fallback)
MIN_EAR_VARIANCE: float = 0.005
# Minimum absolute EAR range (max - min) to confirm blink without state machine
MIN_EAR_RANGE: float = 0.04

# ── Standard MediaPipe 468-landmark mesh eye indices ──────────────────────────
LEFT_EYE_IDX:  List[int] = [33, 160, 158, 133, 153, 144]
RIGHT_EYE_IDX: List[int] = [362, 385, 387, 263, 373, 380]

# ── Singleton MediaPipe face mesh ─────────────────────────────────────────────
_face_mesh = mp.solutions.face_mesh.FaceMesh(
    static_image_mode=True,
    max_num_faces=1,
    refine_landmarks=True,
    min_detection_confidence=0.4,   # slightly looser — handles more poses
)


def _euclidean(p1: Sequence[float], p2: Sequence[float]) -> float:
    """2-D Euclidean distance."""
    return math.dist(p1[:2], p2[:2])


def _eye_aspect_ratio(landmarks: list, eye_indices: List[int]) -> float:
    """Compute EAR for one eye given the full 468-landmark list.

    Points layout (Soukupova & Cech 2016):
        p1 = corner-left   p4 = corner-right
        p2, p3 = upper lid  p5, p6 = lower lid

    EAR = (||p2-p6|| + ||p3-p5||) / (2 * ||p1-p4||)
    """
    p = [
        (landmarks[i].x, landmarks[i].y, landmarks[i].z)
        for i in eye_indices
    ]
    vertical_1 = _euclidean(p[1], p[5])
    vertical_2 = _euclidean(p[2], p[4])
    horizontal = _euclidean(p[0], p[3])

    if horizontal == 0:
        return 0.0
    return (vertical_1 + vertical_2) / (2.0 * horizontal)


def _avg_ear_for_frame(image_bgr: np.ndarray) -> float | None:
    """Return the average EAR (both eyes) for a single image frame.

    Returns None if no face is detected.
    """
    rgb = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)
    h, w = rgb.shape[:2]
    max_dim = max(h, w)
    if max_dim > 480:
        scale = 480.0 / max_dim
        rgb = cv2.resize(rgb, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)

    results = _face_mesh.process(rgb)
    if not results.multi_face_landmarks:
        return None

    lms = results.multi_face_landmarks[0].landmark
    left_ear  = _eye_aspect_ratio(lms, LEFT_EYE_IDX)
    right_ear = _eye_aspect_ratio(lms, RIGHT_EYE_IDX)
    return (left_ear + right_ear) / 2.0



def detect_blink(frames_bytes: List[bytes]) -> tuple[bool, str]:
    """Analyse a multi-frame burst for a genuine blink using adaptive EAR.

    The detector works robustly even for glasses wearers because it computes
    thresholds from the sequence's own max/min EAR rather than fixed values.

    Args:
        frames_bytes: List of raw image bytes (JPEG/PNG), 2–5 frames.

    Returns:
        Tuple of (liveness_passed: bool, message: str).
    """
    if not (2 <= len(frames_bytes) <= 10):
        return False, f"Expected 2–10 frames, received {len(frames_bytes)}."

    ear_sequence: list[float] = []
    for idx, raw in enumerate(frames_bytes):
        arr = np.frombuffer(raw, dtype=np.uint8)
        frame = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if frame is None:
            logger.warning("Frame %d could not be decoded — skipping.", idx + 1)
            continue

        # Resize large frames before EAR inference — _avg_ear_for_frame will further
        # resize to 480px, but capping here reduces decode/copy overhead on CPU.
        h, w = frame.shape[:2]
        if max(h, w) > 640:
            scale = 640 / max(h, w)
            frame = cv2.resize(frame, (int(w * scale), int(h * scale)))

        ear = _avg_ear_for_frame(frame)
        if ear is None:
            logger.warning("No face detected in frame %d — skipping.", idx + 1)
            continue
        ear_sequence.append(ear)
        logger.debug("Frame %d  EAR=%.4f", idx + 1, ear)

    logger.info("EAR sequence: %s", [f"{e:.4f}" for e in ear_sequence])

    if len(ear_sequence) < 2:
        return False, "Face not detected in enough frames to evaluate liveness."

    max_ear = max(ear_sequence)
    min_ear = min(ear_sequence)
    ear_range = max_ear - min_ear
    ear_variance = float(np.var(ear_sequence))

    logger.info(
        "EAR stats — max=%.4f  min=%.4f  range=%.4f  variance=%.6f",
        max_ear, min_ear, ear_range, ear_variance,
    )

    # ── Primary check: adaptive blink detection ───────────────────────────────
    # Avoids fixed thresholds that break for glasses wearers.
    closed_thresh = max_ear * BLINK_RATIO   # e.g. 0.75 * max
    open_thresh   = max_ear * OPEN_RATIO    # e.g. 0.85 * max

    has_open_frame   = any(e >= open_thresh   for e in ear_sequence)
    has_closed_frame = any(e <= closed_thresh for e in ear_sequence)

    if has_open_frame and has_closed_frame:
        logger.info("Adaptive blink confirmed — open=%.4f  closed=%.4f  thresh=%.4f",
                    max_ear, min_ear, closed_thresh)
        return True, "Liveness confirmed — blink detected."

    # ── Fallback: significant EAR range / variance check ─────────────────────
    # Catches cases where the absolute EAR is compressed (heavy glasses, low light)
    # but there is still measurable eye movement across frames.
    if ear_range >= MIN_EAR_RANGE or ear_variance >= MIN_EAR_VARIANCE:
        logger.info(
            "Liveness confirmed via EAR variance fallback (range=%.4f, var=%.6f).",
            ear_range, ear_variance,
        )
        return True, "Liveness confirmed — eye movement detected across frames."

    # ── Denied ────────────────────────────────────────────────────────────────
    logger.warning(
        "Liveness FAILED — EAR range=%.4f (need %.4f), variance=%.6f (need %.6f).",
        ear_range, MIN_EAR_RANGE, ear_variance, MIN_EAR_VARIANCE,
    )
    return (
        False,
        f"Liveness check failed — insufficient eye movement detected "
        f"(EAR range={ear_range:.4f}). Please blink clearly while facing the camera.",
    )
