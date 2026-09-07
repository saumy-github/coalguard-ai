from typing import Optional

from pydantic import BaseModel, model_validator

from ..models.user import UserType


class CreateUserRequest(BaseModel):
    email: Optional[str] = None
    phone: Optional[str] = None
    password: str
    role: UserType
    full_name: Optional[str] = None

    @model_validator(mode="after")
    def require_email_or_phone(self) -> "CreateUserRequest":
        if not self.email and not self.phone:
            raise ValueError("At least one of email or phone is required")
        return self


class UserResponse(BaseModel):
    id: str
    email: Optional[str] = None
    phone: Optional[str] = None
    role: UserType
    full_name: Optional[str] = None
    active: bool
    # Mine scope exactly as stored — mine (worker/officer) or mines
    # (corporate/regulator) is populated depending on role, never both, never
    # a synthetic flattened list invented for display convenience.
    mine: Optional[str] = None
    mines: list[str] = []
    photo_url: Optional[str] = None


class ChangeRoleRequest(BaseModel):
    role: UserType


class UpdateUserMineRequest(BaseModel):
    mine_id: Optional[str] = None


class UpdateUserMinesRequest(BaseModel):
    mine_ids: list[str] = []
