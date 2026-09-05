from datetime import datetime, timezone
from typing import List, Literal, Optional

from beanie import Document, PydanticObjectId
from pydantic import BaseModel, Field

Pillar = Literal["safety", "environment", "production", "labour"]
InspectionSource = Literal["manual", "sensor", "cv"]


class Observation(BaseModel):
    """Embedded on Inspection, per research/lld.md §4 — mirrors the frontend's
    offline queue schema (frontend/src/lib/db.ts) field for field.

    photo_urls/voice_note_url currently hold raw base64 data URIs, same as the
    frontend comment on ObservationForm.tsx flags: there's no dedicated media
    upload endpoint/blob storage yet, so the capture is stored inline until one
    exists. Fine for a demo; would bloat this collection at real volume.
    """

    description: str
    pillar: Pillar
    photo_urls: List[str] = Field(default_factory=list)
    voice_note_url: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    # When the Worker actually captured this — can predate `Inspection.created_at`
    # by a while if it sat in the offline queue before syncing.
    captured_at: datetime


class Inspection(Document):
    mine_id: Optional[PydanticObjectId] = None
    source: InspectionSource
    worker_id: PydanticObjectId
    # One Observation per Inspection for now — each offline-queue submission
    # creates its own Inspection. lld.md's array shape leaves room for a
    # future flow that batches multiple observations into one inspection
    # session before submitting; nothing currently does that.
    observations: List[Observation]
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "inspections"
