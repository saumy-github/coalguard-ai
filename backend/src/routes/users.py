from fastapi import APIRouter, Depends

from ..auth.dependencies import require_user_types
from ..models.user import User
from ..schemas.users import CreateUserRequest, UserResponse
from ..services import user_service

router = APIRouter(prefix="/users", tags=["users"])


def _to_response(user: User) -> UserResponse:
    return UserResponse(
        id=str(user.id),
        email=user.email,
        phone=user.phone,
        user_type=user.user_type,
        mine_id=str(user.mine_id) if user.mine_id else None,
        subsidiary_id=str(user.subsidiary_id) if user.subsidiary_id else None,
        full_name=user.full_name,
        role_title=user.role_title,
        is_guest=user.is_guest,
        active=user.active,
    )


@router.post("", response_model=UserResponse, dependencies=[Depends(require_user_types("admin"))])
async def create_user(payload: CreateUserRequest) -> UserResponse:
    user = await user_service.create_user(
        email=payload.email,
        phone=payload.phone,
        password=payload.password,
        user_type=payload.user_type,
        mine_id=payload.mine_id,
        subsidiary_id=payload.subsidiary_id,
        full_name=payload.full_name,
        role_title=payload.role_title,
    )
    return _to_response(user)


@router.get("", response_model=list[UserResponse], dependencies=[Depends(require_user_types("admin"))])
async def list_users() -> list[UserResponse]:
    users = await user_service.list_users()
    return [_to_response(user) for user in users]
