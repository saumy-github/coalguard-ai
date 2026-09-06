from typing import Optional

from pydantic import BaseModel

from ..models.user import UserType


class LoginRequest(BaseModel):
    identifier: str  # email or phone
    password: str


class GoogleLoginRequest(BaseModel):
    id_token: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class CurrentUserResponse(BaseModel):
    id: str
    email: Optional[str] = None
    phone: Optional[str] = None
    role: UserType
    full_name: Optional[str] = None
    # Mine scope exactly as stored — mirrors UserResponse (schemas/users.py).
    mine: Optional[str] = None
    mines: list[str] = []
