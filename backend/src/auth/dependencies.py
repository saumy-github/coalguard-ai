from beanie import PydanticObjectId
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError

from ..models.user import User, UserType, get_profile
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
    """Every mine the user's own profile scopes them to. Empty means no
    access — callers must never treat that as "see everything"."""
    profile = get_profile(user)
    mine = getattr(profile, "mine", None)
    if mine is not None:
        return [mine]
    mines = getattr(profile, "mines", None)
    if mines:
        return list(mines)
    return []


async def require_mine_assignment(user: User) -> PydanticObjectId:
    """The caller's one assigned mine (worker/officer). Raises rather than
    silently proceeding with no scope."""
    mine_ids = await accessible_mine_ids(user)
    if not mine_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User has no assigned mine",
        )
    return mine_ids[0]
