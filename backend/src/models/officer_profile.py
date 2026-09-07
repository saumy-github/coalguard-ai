from typing import Optional

from beanie import PydanticObjectId
from pydantic import BaseModel


class OfficerProfile(BaseModel):
    mine: Optional[PydanticObjectId] = None
    photo_url: Optional[str] = None

