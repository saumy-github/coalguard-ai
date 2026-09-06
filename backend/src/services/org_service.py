from ..models.mine import Mine

# Approximate demo coordinates, not surveyed mine boundaries.
ECL_MINE_NAME = "ECL Sector 7G"
ECL_MINE_LAT, ECL_MINE_LNG = 23.6739, 86.9524  # Asansol, West Bengal
BCCL_MINE_NAME = "BCCL Moonidih"
BCCL_MINE_LAT, BCCL_MINE_LNG = 23.8315, 86.4880  # near Dhanbad, Jharkhand


async def ensure_placeholder_mine() -> Mine:
    mine = await Mine.find_one(Mine.name == ECL_MINE_NAME)
    if mine is None:
        mine = await Mine(name=ECL_MINE_NAME, lat=ECL_MINE_LAT, lng=ECL_MINE_LNG).insert()
    elif mine.lat is None or mine.lng is None:
        mine.lat = ECL_MINE_LAT
        mine.lng = ECL_MINE_LNG
        await mine.save()

    return mine


async def ensure_second_demo_mine() -> Mine:
    mine = await Mine.find_one(Mine.name == BCCL_MINE_NAME)
    if mine is None:
        mine = await Mine(name=BCCL_MINE_NAME, lat=BCCL_MINE_LAT, lng=BCCL_MINE_LNG).insert()
    return mine
