from beanie import PydanticObjectId
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError

from ..models.mine_assignment import MineAssignment
from ..models.user import User, UserType
from .security import decode_access_token

bearer_scheme = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> User:
    try:
        payload = decode_access_token(credentials.credentials)
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        ) from exc

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )

    user = await User.get(user_id)
    if not user or not user.active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )

    return user


def require_role(*roles: UserType):
    """Dependency factory — restricts a route to the given roles."""

    async def dependency(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )
        return user

    return dependency


async def accessible_mine_ids(user: User) -> list[PydanticObjectId]:
    """Every mine the user has an active MineAssignment for. Empty for a user
    with none — callers must treat that as "no access", never "see everything".

    Regulator is the one exception: it has no MineAssignment of its own.
    Decision #13's "Regulator scope" note (research/saumy/09-changes-5-sep.md)
    simplifies to exactly one Regulatory Authority account for now, under
    which a regulator's scope is derived — every mine with an active
    Corporate Management assignment, full stop. This breaks the moment a
    second regulator exists (both would trivially see the same set); the real
    fix is a `regulator_assignments` collection, deferred until then.
    """
    if user.role == "regulator":
        assignments = await MineAssignment.find(
            MineAssignment.role == "corporate_manager", MineAssignment.active == True  # noqa: E712
        ).to_list()
    else:
        assignments = await MineAssignment.find(
            MineAssignment.user_id == user.id, MineAssignment.active == True  # noqa: E712
        ).to_list()
    return list({a.mine_id for a in assignments})


async def require_mine_assignment(user: User) -> PydanticObjectId:
    """For today's single-mine-scoped callers (Worker, Safety Officer): their
    one active mine assignment. Replaces the old require_mine_scope, which read
    User.mine_id directly — that field is unused/legacy now (see models/user.py).
    Raises rather than silently proceeding with no scope.
    """
    mine_ids = await accessible_mine_ids(user)
    if not mine_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User has no active mine assignment",
        )
    return mine_ids[0]
