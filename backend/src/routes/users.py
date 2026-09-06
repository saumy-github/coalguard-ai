from beanie import PydanticObjectId
from fastapi import APIRouter, Depends, HTTPException, status

from ..auth.dependencies import require_role
from ..models.user import User, get_profile, set_profile
from ..schemas.users import (
    ChangeRoleRequest,
    CreateUserRequest,
    UpdateUserMineRequest,
    UpdateUserMinesRequest,
    UserResponse,
)
from ..services import provision_service, user_service

router = APIRouter(prefix="/users", tags=["users"])

_SINGLE_MINE_ROLES = {"worker", "safety_officer"}
_MULTI_MINE_ROLES = {"corporate_manager", "regulator"}


def _to_response(user: User) -> UserResponse:
    profile = get_profile(user)
    mine = getattr(profile, "mine", None)
    mines = getattr(profile, "mines", None) or []
    return UserResponse(
        id=str(user.id),
        email=user.email,
        phone=user.phone,
        role=user.role,
        full_name=user.full_name,
        active=user.active,
        mine=str(mine) if mine else None,
        mines=[str(mine_id) for mine_id in mines],
    )


@router.post("", response_model=UserResponse)
async def create_user(
    payload: CreateUserRequest,
    actor: User = Depends(require_role("admin", "regulator", "corporate_manager", "safety_officer")),
) -> UserResponse:
    user = await provision_service.provision_user(
        actor=actor,
        email=payload.email,
        phone=payload.phone,
        password=payload.password,
        role=payload.role,
        full_name=payload.full_name,
    )
    return _to_response(user)


@router.get("", response_model=list[UserResponse], dependencies=[Depends(require_role("admin"))])
async def list_users() -> list[UserResponse]:
    users = await user_service.list_users()
    return [_to_response(user) for user in users]


@router.patch("/{user_id}/role", response_model=UserResponse)
async def change_role(
    user_id: str,
    payload: ChangeRoleRequest,
    actor: User = Depends(require_role("admin")),
) -> UserResponse:
    target = await User.get(PydanticObjectId(user_id))
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    updated = await provision_service.change_role(actor=actor, target=target, new_role=payload.role)
    return _to_response(updated)


@router.patch("/{user_id}/mine", response_model=UserResponse, dependencies=[Depends(require_role("admin"))])
async def update_user_mine(user_id: str, payload: UpdateUserMineRequest) -> UserResponse:
    target = await User.get(PydanticObjectId(user_id))
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if target.role not in _SINGLE_MINE_ROLES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{target.role} accounts don't have a single mine — use /mines instead",
        )
    profile = get_profile(target)
    profile.mine = PydanticObjectId(payload.mine_id) if payload.mine_id else None
    set_profile(target, profile)
    await target.save()
    return _to_response(target)


@router.patch("/{user_id}/mines", response_model=UserResponse, dependencies=[Depends(require_role("admin"))])
async def update_user_mines(user_id: str, payload: UpdateUserMinesRequest) -> UserResponse:
    target = await User.get(PydanticObjectId(user_id))
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if target.role not in _MULTI_MINE_ROLES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{target.role} accounts don't have a mine list — use /mine instead",
        )
    profile = get_profile(target)
    profile.mines = [PydanticObjectId(mine_id) for mine_id in payload.mine_ids]
    set_profile(target, profile)
    await target.save()
    return _to_response(target)
