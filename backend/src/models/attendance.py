from datetime import datetime, timezone
from typing import Optional

from beanie import Document, PydanticObjectId
from pydantic import Field


class AttendanceRecord(Document):
    worker_id: PydanticObjectId
    mine_id: Optional[PydanticObjectId] = None
    selfie_saved: Optional[str] = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "attendance"
