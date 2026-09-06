from datetime import datetime, timezone
from typing import Literal, Optional

from beanie import Document, PydanticObjectId
from pydantic import Field

AttendanceStatus = Literal["verified", "rejected"]


class AttendanceRecord(Document):
    user_id: Optional[PydanticObjectId] = None
    worker_id: str
    worker_name: str
    mine_id: Optional[PydanticObjectId] = None
    mine_name: Optional[str] = None
    latitude: float
    longitude: float
    distance_from_site_m: float
    status: AttendanceStatus = "verified"
    liveness: Optional[str] = None
    identity: Optional[str] = None
    selfie_saved: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "attendance_records"
