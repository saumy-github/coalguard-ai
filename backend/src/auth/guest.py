from ..models.user import User, UserType
from ..services.mine_assignment_service import ensure_mine_assignment
from ..services.org_service import ensure_placeholder_org

# One demo account per role, so a guest can pick one and explore with
# pre-seeded data. See research/lld.md §7a — the exact guest mechanic was
# left open; this is the "one seeded demo user per role" option.
#
# `scope` decides which placeholder org id (from ensure_placeholder_org) the
# account gets, matching research/saumy/09-changes-5-sep.md Decision #12's
# scoping rules: Worker/Safety Officer are mine-scoped. Corporate also gets a
# real MineAssignment to the placeholder mine as of Decision #11/Phase 6 (its
# `subsidiary` scope below only drives the legacy, unused subsidiary_id field
# now — real Corporate scoping is MineAssignment-based, same as everyone
# else). Regulator/Admin see everything so they get neither.
GUEST_SEED_USERS: list[dict] = [
    {"role": "worker", "full_name": "Guest Worker", "role_title": "Worker", "scope": "mine"},
    {"role": "safety_officer", "full_name": "Guest Mine Safety Officer", "scope": "mine"},
    {"role": "corporate_manager", "full_name": "Guest Corporate Manager", "scope": "subsidiary"},
    {"role": "regulator", "full_name": "Guest Regulatory Auditor", "scope": None},
    {"role": "admin", "full_name": "Guest Admin", "scope": None},
]


async def ensure_guest_users_seeded() -> None:
    """Create one demo User per role for guest login, if not already present.
    Also backfills mine_id/subsidiary_id and the MineAssignment on any guest
    account seeded before scope assignment existed here — otherwise a guest
    seeded under an older version of this function would stay permanently
    unscoped (e.g. the guest Worker unable to see any PersonIssue because it
    had no MineAssignment).
    """
    subsidiary, mine = await ensure_placeholder_org()

    for seed in GUEST_SEED_USERS:
        expected_mine_id = mine.id if seed["scope"] == "mine" else None
        expected_subsidiary_id = subsidiary.id if seed["scope"] == "subsidiary" else None

        existing = await User.find_one(
            User.role == seed["role"], User.is_guest == True  # noqa: E712
        )
        if existing:
            if existing.mine_id != expected_mine_id or existing.subsidiary_id != expected_subsidiary_id:
                existing.mine_id = expected_mine_id
                existing.subsidiary_id = expected_subsidiary_id
                await existing.save()
            user = existing
        else:
            user = await User(
                role=seed["role"],
                full_name=seed["full_name"],
                role_title=seed.get("role_title"),
                mine_id=expected_mine_id,
                subsidiary_id=expected_subsidiary_id,
                is_guest=True,
                active=True,
            ).insert()

        if seed["scope"] in ("mine", "subsidiary"):
            await ensure_mine_assignment(user, mine.id)


async def get_guest_user(role: UserType) -> User | None:
    return await User.find_one(User.role == role, User.is_guest == True)  # noqa: E712
