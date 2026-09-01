from fastapi import APIRouter, Depends, HTTPException, status

from ..auth.dependencies import get_current_user
from ..models.user import User
from ..schemas.auth import (
    CurrentUserResponse,
    GoogleLoginRequest,
    GuestLoginRequest,
    LoginRequest,
    TokenResponse,
)
from ..services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest) -> TokenResponse:
    try:
        token = await auth_service.login_with_password(payload.email, payload.password)
    except auth_service.AuthError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)
        ) from exc
    return TokenResponse(access_token=token)


@router.post("/google", response_model=TokenResponse)
async def google_login(payload: GoogleLoginRequest) -> TokenResponse:
    try:
        token = await auth_service.login_with_google(payload.id_token)
    except auth_service.AuthError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)
        ) from exc
    return TokenResponse(access_token=token)


@router.post("/guest", response_model=TokenResponse)
async def guest_login(payload: GuestLoginRequest) -> TokenResponse:
    try:
        token = await auth_service.login_as_guest(payload.user_type)
    except auth_service.AuthError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        ) from exc
    return TokenResponse(access_token=token)


@router.get("/me", response_model=CurrentUserResponse)
async def me(user: User = Depends(get_current_user)) -> CurrentUserResponse:
    return CurrentUserResponse(
        id=str(user.id),
        email=user.email,
        user_type=user.user_type,
        full_name=user.full_name,
        mine_id=str(user.mine_id) if user.mine_id else None,
        subsidiary_id=str(user.subsidiary_id) if user.subsidiary_id else None,
        is_guest=user.is_guest,
    )
