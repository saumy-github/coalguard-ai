from datetime import datetime, timezone
from typing import Optional

from beanie import Document, PydanticObjectId
from pydantic import Field


class AttendanceRecord(Document):
    worker_id: str
    user_id: Optional[PydanticObjectId] = None
    worker_name: Optional[str] = None
    mine_id: Optional[PydanticObjectId] = None
    mine_name: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    distance_from_site_m: Optional[float] = None
    status: str = "verified"
    liveness: Optional[str] = None
    identity: Optional[str] = None
    selfie_saved: Optional[str] = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "attendance"

