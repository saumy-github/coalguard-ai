from beanie import Document, PydanticObjectId


class MineLevel(Document):
    mine_id: PydanticObjectId
    level: str
    section_count: int

    class Settings:
        name = "mine_levels"
