from beanie import PydanticObjectId
from pydantic import BaseModel


class CorporateProfile(BaseModel):
    mines: list[PydanticObjectId] = []
