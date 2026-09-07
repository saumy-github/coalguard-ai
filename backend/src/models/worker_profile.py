from typing import Optional

from beanie import PydanticObjectId
from pydantic import BaseModel


class WorkerProfile(BaseModel):
    mine: Optional[PydanticObjectId] = None
    photo_url: Optional[str] = None

