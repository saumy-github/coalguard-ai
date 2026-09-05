from typing import Optional

from beanie import PydanticObjectId
from beanie.operators import In

from ..models.mine import Mine


async def list_mines_by_ids(mine_ids: list[PydanticObjectId]) -> list[Mine]:
    if not mine_ids:
        return []
    return await Mine.find(In(Mine.id, mine_ids)).to_list()


async def list_all_mines() -> list[Mine]:
    return await Mine.find_all().to_list()


async def create_mine(*, name: str, lat: Optional[float], lng: Optional[float]) -> Mine:
    mine = Mine(subsidiary_id=None, name=name, lat=lat, lng=lng)
    await mine.insert()
    return mine
