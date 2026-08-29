"""
YOLOv8 PPE Fine-Tuning Script
===============================
Fine-tunes a YOLOv8-nano model on the Safety-Helmet / Reflective-Jacket
dataset and exports the best weights to data/models/best.pt.

Usage:
    python train_cv.py                         # defaults (50 epochs)
    python train_cv.py --epochs 100 --batch 32 # custom
"""

from __future__ import annotations

import argparse
import logging
import shutil
from pathlib import Path

import torch
from ultralytics import YOLO

# PyTorch 2.6+ weights_only compatibility patch for YOLO models
_orig_torch_load = torch.load
def _safe_torch_load(*args, **kwargs):
    if "weights_only" not in kwargs:
        kwargs["weights_only"] = False
    return _orig_torch_load(*args, **kwargs)
torch.load = _safe_torch_load

# ── Constants ─────────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent
DATA_YAML = BASE_DIR / "data" / "models" / "safety-Helmet-Reflective-Jacket" / "data.yaml"
OUTPUT_WEIGHTS = BASE_DIR / "data" / "models" / "best.pt"
DEFAULT_BASE_MODEL = "yolov8n.pt"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s │ %(levelname)-8s │ %(message)s",
)
logger = logging.getLogger(__name__)


def train(
    base_model: str = DEFAULT_BASE_MODEL,
    data_yaml: Path = DATA_YAML,
    epochs: int = 50,
    imgsz: int = 640,
    batch: int = 16,
    project: str = "runs/ppe_detect",
    name: str = "train",
) -> Path:
    """Run YOLOv8 fine-tuning and return the path to the best weights.

    Args:
        base_model: Pre-trained YOLO checkpoint (downloaded automatically).
        data_yaml: Path to the YOLO data.yaml describing the dataset.
        epochs: Number of training epochs.
        imgsz: Input image resolution.
        batch: Batch size.
        project: Output project directory.
        name: Run name within the project directory.

    Returns:
        Path to the ``best.pt`` weights file produced by training.
    """
    logger.info("Loading base model: %s", base_model)
    model = YOLO(base_model)

    logger.info(
        "Starting training — epochs=%d  imgsz=%d  batch=%d  data=%s",
        epochs,
        imgsz,
        batch,
        data_yaml,
    )
    results = model.train(
        data=str(data_yaml),
        epochs=epochs,
        imgsz=imgsz,
        batch=batch,
        project=project,
        name=name,
        exist_ok=True,
        verbose=True,
    )

    # Locate the best weights produced by training
    best_weights = Path(project) / name / "weights" / "best.pt"
    if not best_weights.exists():
        # Fallback: some ultralytics versions expose it via results
        logger.warning(
            "Expected best.pt at %s — checking results object …",
            best_weights,
        )
        best_weights = Path(str(getattr(results, "save_dir", project))) / "weights" / "best.pt"

    if not best_weights.exists():
        raise FileNotFoundError(
            f"Training completed but best.pt not found. "
            f"Check {project}/{name}/weights/ manually."
        )

    return best_weights


def export_weights(source: Path, destination: Path = OUTPUT_WEIGHTS) -> None:
    """Copy best weights to the canonical location."""
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, destination)
    logger.info("✓ Exported weights → %s", destination)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Fine-tune YOLOv8 on PPE detection dataset."
    )
    parser.add_argument(
        "--base-model",
        type=str,
        default=DEFAULT_BASE_MODEL,
        help="Base YOLO model checkpoint (default: yolov8n.pt).",
    )
    parser.add_argument(
        "--data-yaml",
        type=Path,
        default=DATA_YAML,
        help="Path to data.yaml (default: data/models/safety-…/data.yaml).",
    )
    parser.add_argument(
        "--epochs",
        type=int,
        default=50,
        help="Training epochs (default: 50).",
    )
    parser.add_argument(
        "--imgsz",
        type=int,
        default=640,
        help="Input image size (default: 640).",
    )
    parser.add_argument(
        "--batch",
        type=int,
        default=16,
        help="Batch size (default: 16).",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=OUTPUT_WEIGHTS,
        help="Destination for exported best.pt (default: data/models/best.pt).",
    )
    args = parser.parse_args()

    best_pt = train(
        base_model=args.base_model,
        data_yaml=args.data_yaml,
        epochs=args.epochs,
        imgsz=args.imgsz,
        batch=args.batch,
    )
    export_weights(best_pt, args.output)
    logger.info("Done ✓")


if __name__ == "__main__":
    main()
