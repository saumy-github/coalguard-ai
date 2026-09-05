from typing import Optional

from pydantic import BaseModel

from ..models.user import UserType


class LoginRequest(BaseModel):
    identifier: str  # email or phone
    password: str


class GoogleLoginRequest(BaseModel):
    id_token: str


class GuestLoginRequest(BaseModel):
    role: UserType


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class CurrentUserResponse(BaseModel):
    id: str
    email: Optional[str] = None
    phone: Optional[str] = None
    role: UserType
    full_name: Optional[str] = None
    is_guest: bool
    # Active MineAssignment mine IDs (Decision #12) — replaces the old bare
    # mine_id/subsidiary_id, which only ever supported a single mine anyway.
    mine_ids: list[str] = []
