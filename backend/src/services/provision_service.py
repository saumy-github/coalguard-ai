from typing import Optional

from fastapi import HTTPException, status

from ..models.user import User, UserType, empty_profile_for_role, set_profile
from . import user_service

# Allow-list, not a denial rule — anything not listed for an actor's role is
# refused, which blocks every peer/upward case without a separate check.
DELEGATION_HIERARCHY: dict[UserType, set[UserType]] = {
    "admin": {"worker", "safety_officer", "corporate_manager", "regulator", "admin"},
    "regulator": {"corporate_manager"},
    "corporate_manager": {"safety_officer"},
    "safety_officer": {"worker"},
}


async def provision_user(
    *,
    actor: User,
    email: Optional[str],
    phone: Optional[str],
    password: str,
    role: UserType,
    full_name: Optional[str],
) -> User:
    allowed_roles = DELEGATION_HIERARCHY.get(actor.role, set())
    if role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"A {actor.role} may not create a {role} account",
        )

    return await user_service.create_user(
        email=email,
        phone=phone,
        password=password,
        role=role,
        full_name=full_name,
    )


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
    # Reset profile too, not just role — otherwise a stale profile shape (e.g.
    # an old WorkerProfile) could linger on an account after its role changes.
    set_profile(target, empty_profile_for_role(new_role))
    await target.save()
    return target
