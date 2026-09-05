from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field

from ..models.inspection import Pillar


class ObservationIn(BaseModel):
    description: str
    pillar: Pillar
    photo_urls: List[str] = Field(default_factory=list)
    voice_note_url: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    captured_at: datetime


class InspectionResponse(BaseModel):
    id: str
    mine_id: Optional[str] = None
    source: str
    worker_id: str
    created_at: datetime
