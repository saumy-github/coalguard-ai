from beanie import PydanticObjectId
from pydantic import BaseModel


class RegulatorProfile(BaseModel):
    mines: list[PydanticObjectId] = []
