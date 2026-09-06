from beanie import Document, PydanticObjectId
from pydantic import BaseModel


class SectionLayout(BaseModel):
    section: int
    polygon: list[list[float]]
    centroid: list[float]


class MineLevel(Document):
    mine_id: PydanticObjectId
    level: str
    section_count: int
    boundary: list[list[float]] = []
    view_box: list[float] = []
    sections: list[SectionLayout] = []

    class Settings:
        name = "mine_levels"
