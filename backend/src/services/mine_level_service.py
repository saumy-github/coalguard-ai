from beanie import PydanticObjectId

from ..models.mine_level import MineLevel


async def list_mine_levels(mine_id: PydanticObjectId) -> list[MineLevel]:
    return await MineLevel.find(MineLevel.mine_id == mine_id).to_list()
