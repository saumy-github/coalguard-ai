"""
Computer Vision — PPE Detection Engine
========================================
Loads a YOLOv8 model (fine-tuned or base) and exposes a ``detect()``
function that accepts raw image bytes, runs inference, and returns
structured detection results including a violation flag.

Classes detected (from data.yaml):
    0 — Safety-Helmet
    1 — Reflective-Jacket
"""

from __future__ import annotations

import io
import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional

import numpy as np
import torch
from PIL import Image
from ultralytics import YOLO

# PyTorch 2.6+ weights_only compatibility patch for YOLO models
_orig_torch_load = torch.load
def _safe_torch_load(*args, **kwargs):
    if "weights_only" not in kwargs:
        kwargs["weights_only"] = False
    return _orig_torch_load(*args, **kwargs)
torch.load = _safe_torch_load

# ── Constants ─────────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent.parent
FINE_TUNED_WEIGHTS = BASE_DIR / "data" / "models" / "best.pt"
FALLBACK_WEIGHTS = "yolov8n.pt"  # downloaded on first use by ultralytics

CLASS_NAMES: Dict[int, str] = {
    0: "Safety-Helmet",
    1: "Reflective-Jacket",
}

logger = logging.getLogger(__name__)


# ── Data Structures ──────────────────────────────────────────────────────────
@dataclass
class BoundingBox:
    """Single detected object."""

    class_id: int
    class_name: str
    confidence: float
    x_min: float
    y_min: float
    x_max: float
    y_max: float


@dataclass
class CVDetectionResult:
    """Aggregate result for one image."""

    total_detections: int = 0
    helmet_count: int = 0
    vest_count: int = 0
    violation_detected: bool = False
    violation_reason: str = ""
    bounding_boxes: List[Dict[str, Any]] = field(default_factory=list)
    model_used: str = ""


# ── Singleton Model Loader ───────────────────────────────────────────────────
_model: Optional[YOLO] = None
_model_path_used: str = ""


def _load_model() -> YOLO:
    """Lazily load the YOLO model (fine-tuned weights preferred)."""
    global _model, _model_path_used

    if _model is not None:
        return _model

    if FINE_TUNED_WEIGHTS.exists():
        logger.info("Loading fine-tuned weights: %s", FINE_TUNED_WEIGHTS)
        _model = YOLO(str(FINE_TUNED_WEIGHTS))
        _model_path_used = str(FINE_TUNED_WEIGHTS)
    else:
        logger.warning(
            "Fine-tuned weights not found at %s — falling back to %s",
            FINE_TUNED_WEIGHTS,
            FALLBACK_WEIGHTS,
        )
        _model = YOLO(FALLBACK_WEIGHTS)
        _model_path_used = FALLBACK_WEIGHTS

    return _model


def is_model_ready() -> bool:
    """Return True if the model has been loaded (or can be loaded)."""
    try:
        _load_model()
        return True
    except Exception:
        return False


# ── Public API ───────────────────────────────────────────────────────────────
def detect(
    image_bytes: bytes,
    confidence_threshold: float = 0.25,
    iou_threshold: float = 0.45,
) -> CVDetectionResult:
    """Run PPE detection on raw image bytes.

    Args:
        image_bytes: Raw bytes of a JPEG/PNG image.
        confidence_threshold: Minimum detection confidence.
        iou_threshold: IoU threshold for NMS.

    Returns:
        ``CVDetectionResult`` with per-object bounding boxes and a
        ``violation_detected`` flag (True when any detected person lacks
        full PPE — i.e., helmets ≠ vests or either is zero while the
        other is not).
    """
    model = _load_model()

    # Decode image
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    img_array = np.array(image)

    # Inference
    results = model.predict(
        source=img_array,
        conf=confidence_threshold,
        iou=iou_threshold,
        verbose=False,
    )

    helmet_count = 0
    vest_count = 0
    bounding_boxes: List[Dict[str, Any]] = []

    for result in results:
        boxes = result.boxes
        if boxes is None:
            continue

        for box in boxes:
            cls_id = int(box.cls[0])
            conf = float(box.conf[0])
            xyxy = box.xyxy[0].tolist()  # [x_min, y_min, x_max, y_max]

            cls_name = CLASS_NAMES.get(cls_id, f"class_{cls_id}")

            if cls_id == 0:
                helmet_count += 1
            elif cls_id == 1:
                vest_count += 1

            bounding_boxes.append(
                {
                    "class_id": cls_id,
                    "class_name": cls_name,
                    "confidence": round(conf, 4),
                    "x_min": round(xyxy[0], 2),
                    "y_min": round(xyxy[1], 2),
                    "x_max": round(xyxy[2], 2),
                    "y_max": round(xyxy[3], 2),
                }
            )

    total = len(bounding_boxes)

    # Violation logic:
    # If we see helmets but no vests (or vice-versa), someone is missing PPE.
    # If both are zero but the model detected *something*, it's inconclusive
    # and we report no violation.
    violation = False
    reason = ""
    if helmet_count > 0 or vest_count > 0:
        if helmet_count != vest_count:
            violation = True
            reason = (
                f"PPE mismatch — {helmet_count} helmet(s) vs "
                f"{vest_count} reflective jacket(s) detected."
            )
        if helmet_count == 0:
            violation = True
            reason = (
                f"No helmets detected but {vest_count} "
                f"reflective jacket(s) found."
            )
        if vest_count == 0:
            violation = True
            reason = (
                f"No reflective jackets detected but {helmet_count} "
                f"helmet(s) found."
            )

    return CVDetectionResult(
        total_detections=total,
        helmet_count=helmet_count,
        vest_count=vest_count,
        violation_detected=violation,
        violation_reason=reason,
        bounding_boxes=bounding_boxes,
        model_used=_model_path_used,
    )
