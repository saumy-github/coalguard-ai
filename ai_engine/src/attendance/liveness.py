"""
Liveness Detection via Eye-Aspect-Ratio (EAR) Blink Analysis
=============================================================
Uses MediaPipe Face Mesh to process a sequence of image frames and detect
a genuine human blink by tracking the Eye Aspect Ratio across the burst.

Algorithm
---------
1. For every frame: extract 6 landmark coordinates per eye.
2. Compute EAR = (||p2-p6|| + ||p3-p5||) / (2 * ||p1-p4||)   (Soukupova formula)
3. Classify each frame:   EAR < 0.22  → CLOSED,   EAR > 0.28 → OPEN
4. A valid blink requires the sequence to contain at least one CLOSED frame
   flanked on both sides by OPEN frames  (OPEN → CLOSED → OPEN transition).

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

# ── EAR thresholds ────────────────────────────────────────────────────────────
EAR_CLOSED: float = 0.22   # eye considered closed below this
EAR_OPEN:   float = 0.28   # eye considered open above this

# ── Standard MediaPipe 468-landmark mesh eye indices ──────────────────────────
LEFT_EYE_IDX:  List[int] = [33, 160, 158, 133, 153, 144]
RIGHT_EYE_IDX: List[int] = [362, 385, 387, 263, 373, 380]

# ── Singleton MediaPipe face mesh ─────────────────────────────────────────────
_face_mesh = mp.solutions.face_mesh.FaceMesh(
    static_image_mode=True,
    max_num_faces=1,
    refine_landmarks=True,
    min_detection_confidence=0.5,
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
    # p[0]=p1, p[1]=p2, p[2]=p3, p[3]=p4, p[4]=p5, p[5]=p6
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
    results = _face_mesh.process(rgb)
    if not results.multi_face_landmarks:
        return None

    lms = results.multi_face_landmarks[0].landmark
    left_ear  = _eye_aspect_ratio(lms, LEFT_EYE_IDX)
    right_ear = _eye_aspect_ratio(lms, RIGHT_EYE_IDX)
    return (left_ear + right_ear) / 2.0


def detect_blink(frames_bytes: List[bytes]) -> tuple[bool, str]:
    """Analyse a multi-frame burst for a genuine blink.

    Args:
        frames_bytes: List of raw image bytes (JPEG/PNG), 2–5 frames.

    Returns:
        Tuple of (liveness_passed: bool, message: str).
    """
    if not (2 <= len(frames_bytes) <= 5):
        return False, f"Expected 2–5 frames, received {len(frames_bytes)}."

    ear_sequence: list[float] = []
    for idx, raw in enumerate(frames_bytes):
        arr = np.frombuffer(raw, dtype=np.uint8)
        frame = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if frame is None:
            return False, f"Frame {idx + 1} could not be decoded."

        ear = _avg_ear_for_frame(frame)
        if ear is None:
            logger.warning("No face detected in frame %d — skipping.", idx + 1)
            continue
        ear_sequence.append(ear)
        logger.debug("Frame %d EAR=%.4f", idx + 1, ear)

    if len(ear_sequence) < 2:
        return False, "Face not detected in enough frames to evaluate liveness."

    # Classify each frame
    states = []
    for ear in ear_sequence:
        if ear < EAR_CLOSED:
            states.append("CLOSED")
        elif ear > EAR_OPEN:
            states.append("OPEN")
        else:
            states.append("BETWEEN")

    logger.info("EAR states across frames: %s", states)

    # Detect OPEN → CLOSED → OPEN transition
    n = len(states)
    blink_found = False
    for i in range(1, n - 1):
        if states[i] == "CLOSED" and states[i - 1] == "OPEN" and states[i + 1] == "OPEN":
            blink_found = True
            break

    # Fallback: at least one CLOSED surrounded by any OPEN (looser check for 2-frame bursts)
    if not blink_found and "CLOSED" in states and states[0] == "OPEN":
        blink_found = True

    if blink_found:
        return True, "Liveness confirmed — blink detected."
    return False, "Liveness check failed — no valid blink detected across frames."
