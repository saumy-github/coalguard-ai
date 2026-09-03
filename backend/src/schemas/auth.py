from typing import Optional

from pydantic import BaseModel

from ..models.user import UserType


class LoginRequest(BaseModel):
    identifier: str  # email or phone
    password: str


class GoogleLoginRequest(BaseModel):
    id_token: str


class GuestLoginRequest(BaseModel):
    user_type: UserType


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class CurrentUserResponse(BaseModel):
    id: str
    email: Optional[str] = None
    phone: Optional[str] = None
    user_type: UserType
    full_name: Optional[str] = None
    mine_id: Optional[str] = None
    subsidiary_id: Optional[str] = None
    is_guest: bool
