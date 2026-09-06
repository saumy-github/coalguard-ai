from typing import Optional

from ..auth.security import hash_password
from ..models.user import User, UserType, empty_profile_for_role, set_profile


async def create_user(
    *,
    email: Optional[str],
    phone: Optional[str],
    password: str,
    role: UserType,
    full_name: Optional[str],
) -> User:
    user = User(
        email=email,
        phone=phone,
        password_hash=hash_password(password),
        role=role,
        full_name=full_name,
        active=True,
    )
    set_profile(user, empty_profile_for_role(role))
    await user.insert()
    return user


async def list_users() -> list[User]:
    return await User.find_all().to_list()
