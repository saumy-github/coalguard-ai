from pydantic import BaseModel


class SectionLayoutResponse(BaseModel):
    section: int
    polygon: list[list[float]]
    centroid: list[float]


class MineLevelResponse(BaseModel):
    level: str
    section_count: int
    boundary: list[list[float]]
    view_box: list[float]
    sections: list[SectionLayoutResponse]
