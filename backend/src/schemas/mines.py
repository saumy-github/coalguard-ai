from typing import Optional

from pydantic import BaseModel


class CreateMineRequest(BaseModel):
    name: str
    lat: Optional[float] = None
    lng: Optional[float] = None


class MineResponse(BaseModel):
    id: str
    name: str
    lat: Optional[float] = None
    lng: Optional[float] = None
