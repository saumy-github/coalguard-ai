from typing import Optional

from pydantic import BaseModel, model_validator

from ..models.user import UserType


class CreateUserRequest(BaseModel):
    email: Optional[str] = None
    phone: Optional[str] = None
    password: str
    role: UserType
    mine_id: Optional[str] = None
    subsidiary_id: Optional[str] = None
    full_name: Optional[str] = None
    role_title: Optional[str] = None

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
    role_title: Optional[str] = None
    is_guest: bool
    active: bool
    mine_ids: list[str] = []


class ChangeRoleRequest(BaseModel):
    role: UserType
