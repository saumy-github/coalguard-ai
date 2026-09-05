from ..models.mine import Mine, Subsidiary

# Real coordinates (approximate, for demo flavor only — not surveyed mine
# boundaries) for the two orgs already used as flavor text on the Landing
# page (frontend/src/components/views/LandingPage.tsx's guest role cards).
ECL_MINE_NAME = "ECL Sector 7G"
ECL_MINE_LAT, ECL_MINE_LNG = 23.6739, 86.9524  # Asansol, West Bengal
BCCL_MINE_NAME = "BCCL Moonidih"
BCCL_MINE_LAT, BCCL_MINE_LNG = 23.8315, 86.4880  # near Dhanbad, Jharkhand


async def ensure_placeholder_org() -> tuple[Subsidiary, Mine]:
    """Mine/Subsidiary CRUD (research/lld.md §7b) doesn't exist yet — create one
    placeholder pair if none exist, just enough for seeded/guest users (and the
    Inspections they create) to have a real mine_id/subsidiary_id to point at.
    Shared by scripts/seed_users.py and auth/guest.py rather than each keeping
    their own copy.
    """
    subsidiary = await Subsidiary.find_one()
    if subsidiary is None:
        subsidiary = await Subsidiary(name="Test Subsidiary", code="TEST").insert()

    mine = await Mine.find_one(Mine.subsidiary_id == subsidiary.id)
    if mine is None:
        mine = await Mine(
            subsidiary_id=subsidiary.id, name=ECL_MINE_NAME, lat=ECL_MINE_LAT, lng=ECL_MINE_LNG
        ).insert()
    elif mine.lat is None or mine.lng is None:
        # Backfill for a mine created before Phase 7 added location fields.
        mine.name = ECL_MINE_NAME
        mine.lat = ECL_MINE_LAT
        mine.lng = ECL_MINE_LNG
        await mine.save()

    return subsidiary, mine


async def ensure_second_demo_mine() -> Mine:
    """A second demo mine (Phase 7) so the Regulator's aggregate pages have
    more than one mine to aggregate across — see research/saumy/
    09-changes-5-sep.md Decision #13's "Regulator scope" note. Not tied to a
    Subsidiary (that field is legacy/unused for authorization already, and
    inventing a second Subsidiary document just for this would be pure
    cosmetic overhead).
    """
    mine = await Mine.find_one(Mine.name == BCCL_MINE_NAME)
    if mine is None:
        mine = await Mine(subsidiary_id=None, name=BCCL_MINE_NAME, lat=BCCL_MINE_LAT, lng=BCCL_MINE_LNG).insert()
    return mine
