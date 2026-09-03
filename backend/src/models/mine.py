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

    class Settings:
        name = "mines"
