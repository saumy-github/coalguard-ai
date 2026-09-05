from ..models.mine import Mine, Subsidiary


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
        mine = await Mine(subsidiary_id=subsidiary.id, name="Test Mine").insert()

    return subsidiary, mine
