from typing import Optional

from beanie import Document, PydanticObjectId


class Subsidiary(Document):
    name: str
    code: str

    class Settings:
        name = "subsidiaries"


class Mine(Document):
    subsidiary_id: Optional[PydanticObjectId] = None
    name: str
    # Minimal location fields for Phase 7's Regulatory Mines page — not a real
    # mine registry (that's Decision #14/Phase 8), just enough to place a
    # marker/card per mine.
    lat: Optional[float] = None
    lng: Optional[float] = None

    class Settings:
        name = "mines"
