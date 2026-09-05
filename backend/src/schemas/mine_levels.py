from pydantic import BaseModel


class MineLevelResponse(BaseModel):
    level: str
    section_count: int
