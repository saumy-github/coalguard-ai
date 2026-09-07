"""Shared disk-based photo storage for manually reported issues.

Root-level `uploads/` folder (bind-mounted from the repo root via
docker-compose so it persists on the host, not just inside the container),
subfolders per stage/feature: `pending/` (written before AI classification,
so a report survives even if classification never completes), `site_issues/`
and `person_issues/` (final resting place once classified).
"""

from pathlib import Path
from uuid import uuid4

from fastapi import UploadFile

UPLOADS_ROOT = Path(__file__).resolve().parent.parent / "uploads"
PENDING_DIR = UPLOADS_ROOT / "pending"
SITE_ISSUES_DIR = UPLOADS_ROOT / "site_issues"
PERSON_ISSUES_DIR = UPLOADS_ROOT / "person_issues"

for _dir in (PENDING_DIR, SITE_ISSUES_DIR, PERSON_ISSUES_DIR):
    _dir.mkdir(parents=True, exist_ok=True)


async def save_pending_photo(photo: UploadFile) -> str:
    """Persist an uploaded photo before classification. Returns the absolute
    filesystem path (for internal bookkeeping on `RawIssueReport`, not a URL)."""
    ext = Path(photo.filename or "").suffix or ".jpg"
    dest = PENDING_DIR / f"{uuid4().hex}{ext}"
    dest.write_bytes(await photo.read())
    return str(dest)


def move_to_final(pending_path: str, *, target: str) -> str:
    """Move a classified photo out of pending/ into its final folder. Returns
    the servable URL (mounted at /uploads in main.py), not a filesystem path."""
    src = Path(pending_path)
    dest_dir = SITE_ISSUES_DIR if target == "site_issue" else PERSON_ISSUES_DIR
    dest = dest_dir / src.name
    src.rename(dest)
    return f"/uploads/{dest_dir.name}/{dest.name}"
