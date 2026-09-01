from ..models.user import User, UserType

# One demo account per user type, so a guest can pick one and explore with
# pre-seeded data. See research/lld.md §7a — the exact guest mechanic was
# left open; this is the "one seeded demo user per type" option.
GUEST_SEED_USERS: list[dict] = [
    {"user_type": "worker", "full_name": "Guest Worker", "role_title": "Worker"},
    {"user_type": "mine_safety_officer", "full_name": "Guest Mine Safety Officer"},
    {"user_type": "corporate_management", "full_name": "Guest Corporate Manager"},
    {"user_type": "regulatory_authority", "full_name": "Guest Regulatory Auditor"},
    {"user_type": "admin", "full_name": "Guest Admin"},
]


async def ensure_guest_users_seeded() -> None:
    """Create one demo User per user type for guest login, if not already present."""
    for seed in GUEST_SEED_USERS:
        existing = await User.find_one(
            User.user_type == seed["user_type"], User.is_guest == True  # noqa: E712
        )
        if existing:
            continue
        await User(
            user_type=seed["user_type"],
            full_name=seed["full_name"],
            role_title=seed.get("role_title"),
            is_guest=True,
            has_login=False,
            active=True,
        ).insert()


async def get_guest_user(user_type: UserType) -> User | None:
    return await User.find_one(User.user_type == user_type, User.is_guest == True)  # noqa: E712
