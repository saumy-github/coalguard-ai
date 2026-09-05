from beanie import PydanticObjectId
from fastapi import APIRouter, Depends, HTTPException, status

from ..auth.dependencies import accessible_mine_ids, require_role
from ..models.user import User
from ..schemas.users import ChangeRoleRequest, CreateUserRequest, UserResponse
from ..services import provision_service, user_service

router = APIRouter(prefix="/users", tags=["users"])


async def _to_response(user: User) -> UserResponse:
    return UserResponse(
        id=str(user.id),
        email=user.email,
        phone=user.phone,
        role=user.role,
        full_name=user.full_name,
        role_title=user.role_title,
        is_guest=user.is_guest,
        active=user.active,
        mine_ids=[str(mine_id) for mine_id in await accessible_mine_ids(user)],
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
        mine_id=payload.mine_id,
        full_name=payload.full_name,
        role_title=payload.role_title,
    )
    return await _to_response(user)


@router.get("", response_model=list[UserResponse], dependencies=[Depends(require_role("admin"))])
async def list_users() -> list[UserResponse]:
    users = await user_service.list_users()
    return [await _to_response(user) for user in users]


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
    return await _to_response(updated)
