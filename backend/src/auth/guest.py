from ..models.user import User, UserType
from ..services.org_service import ensure_placeholder_org

# One demo account per user type, so a guest can pick one and explore with
# pre-seeded data. See research/lld.md §7a — the exact guest mechanic was
# left open; this is the "one seeded demo user per type" option.
#
# `scope` decides which placeholder org id (from ensure_placeholder_org) the
# account gets, matching research/lld.md §3's scoping rules: Worker/Officer
# are mine-scoped, Corporate is subsidiary-scoped, Regulator/Admin see
# everything so they get neither.
GUEST_SEED_USERS: list[dict] = [
    {"user_type": "worker", "full_name": "Guest Worker", "role_title": "Worker", "scope": "mine"},
    {"user_type": "mine_safety_officer", "full_name": "Guest Mine Safety Officer", "scope": "mine"},
    {"user_type": "corporate_management", "full_name": "Guest Corporate Manager", "scope": "subsidiary"},
    {"user_type": "regulatory_authority", "full_name": "Guest Regulatory Auditor", "scope": None},
    {"user_type": "admin", "full_name": "Guest Admin", "scope": None},
]


async def ensure_guest_users_seeded() -> None:
    """Create one demo User per user type for guest login, if not already present.
    Also backfills mine_id/subsidiary_id on any guest account seeded before scope
    assignment existed here — otherwise a guest seeded under an older version of
    this function would stay permanently unscoped (e.g. the guest Worker unable
    to submit an Inspection because it had no mine_id).
    """
    subsidiary, mine = await ensure_placeholder_org()

    for seed in GUEST_SEED_USERS:
        expected_mine_id = mine.id if seed["scope"] == "mine" else None
        expected_subsidiary_id = subsidiary.id if seed["scope"] == "subsidiary" else None

        existing = await User.find_one(
            User.user_type == seed["user_type"], User.is_guest == True  # noqa: E712
        )
        if existing:
            if existing.mine_id != expected_mine_id or existing.subsidiary_id != expected_subsidiary_id:
                existing.mine_id = expected_mine_id
                existing.subsidiary_id = expected_subsidiary_id
                await existing.save()
            continue

        await User(
            user_type=seed["user_type"],
            full_name=seed["full_name"],
            role_title=seed.get("role_title"),
            mine_id=expected_mine_id,
            subsidiary_id=expected_subsidiary_id,
            is_guest=True,
            has_login=False,
            active=True,
        ).insert()


async def get_guest_user(user_type: UserType) -> User | None:
    return await User.find_one(User.user_type == user_type, User.is_guest == True)  # noqa: E712
