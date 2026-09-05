from typing import Optional

from beanie import PydanticObjectId
from fastapi import HTTPException, status

from ..auth.dependencies import accessible_mine_ids
from ..models.user import User, UserType
from . import user_service
from .mine_assignment_service import ensure_mine_assignment

# Decision #14 (research/saumy/09-changes-5-sep.md): who may create whom.
# Deliberately an allow-list, not a denial rule — anything not listed for an
# actor's role is refused, which is what blocks every peer/upward case
# ("no role may create a peer or a more privileged role") without needing a
# separate check.
DELEGATION_HIERARCHY: dict[UserType, set[UserType]] = {
    "admin": {"worker", "safety_officer", "corporate_manager", "regulator", "admin"},
    "regulator": {"corporate_manager"},
    "corporate_manager": {"safety_officer"},
    "safety_officer": {"worker"},
}

# Which of an actor's own mines the new user's mine_id must be one of.
# Regulator is absent on purpose — creating a Corporate identity grants no
# mine, per Decision #14 ("creates the corporate identity/role only").
_MINE_SCOPED_CREATOR_ROLES: set[UserType] = {"safety_officer", "corporate_manager"}


async def provision_user(
    *,
    actor: User,
    email: Optional[str],
    phone: Optional[str],
    password: str,
    role: UserType,
    mine_id: Optional[str],
    full_name: Optional[str],
    role_title: Optional[str],
) -> User:
    allowed_roles = DELEGATION_HIERARCHY.get(actor.role, set())
    if role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"A {actor.role} may not create a {role} account",
        )

    target_mine_id: Optional[PydanticObjectId] = None
    if actor.role in _MINE_SCOPED_CREATOR_ROLES:
        if not mine_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="mine_id is required when creating this role",
            )
        target_mine_id = PydanticObjectId(mine_id)
        if target_mine_id not in await accessible_mine_ids(actor):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Can only assign the new user to one of your own mines",
            )
    elif actor.role == "admin" and mine_id:
        # Admin's scope is global — not checked against its own assignments
        # (it has none), but the mine itself must be real.
        target_mine_id = PydanticObjectId(mine_id)
    # actor.role == "regulator": target_mine_id stays None, always.

    user = await user_service.create_user(
        email=email,
        phone=phone,
        password=password,
        role=role,
        mine_id=str(target_mine_id) if target_mine_id else None,
        subsidiary_id=None,
        full_name=full_name,
        role_title=role_title,
    )

    if target_mine_id and role in ("worker", "safety_officer", "corporate_manager"):
        await ensure_mine_assignment(user, target_mine_id)

    return user


async def change_role(*, actor: User, target: User, new_role: UserType) -> User:
    if target.id == actor.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot change your own role")

    if target.role == "admin" and new_role != "admin":
        remaining_admins = await User.find(User.role == "admin", User.active == True).count()  # noqa: E712
        if remaining_admins <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot demote the last remaining active admin",
            )

    target.role = new_role
    await target.save()
    return target
