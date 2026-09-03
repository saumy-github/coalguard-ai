from typing import Optional

from beanie import PydanticObjectId

from ..auth.security import hash_password
from ..models.user import User, UserType


async def create_user(
    *,
    email: Optional[str],
    phone: Optional[str],
    password: str,
    user_type: UserType,
    mine_id: Optional[str],
    subsidiary_id: Optional[str],
    full_name: Optional[str],
    role_title: Optional[str],
) -> User:
    user = User(
        email=email,
        phone=phone,
        password_hash=hash_password(password),
        user_type=user_type,
        mine_id=PydanticObjectId(mine_id) if mine_id else None,
        subsidiary_id=PydanticObjectId(subsidiary_id) if subsidiary_id else None,
        full_name=full_name,
        role_title=role_title,
        is_guest=False,
        has_login=True,
        active=True,
    )
    await user.insert()
    return user


async def list_users() -> list[User]:
    return await User.find_all().to_list()
