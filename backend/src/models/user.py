from typing import Literal, Optional

from beanie import Document, PydanticObjectId

UserType = Literal[
    "worker",
    "mine_safety_officer",
    "corporate_management",
    "regulatory_authority",
    "admin",
]


class User(Document):
    email: Optional[str] = None
    phone: Optional[str] = None
    password_hash: Optional[str] = None
    google_id: Optional[str] = None
    user_type: UserType
    mine_id: Optional[PydanticObjectId] = None
    subsidiary_id: Optional[PydanticObjectId] = None
    full_name: Optional[str] = None
    role_title: Optional[str] = None
    is_guest: bool = False
    has_login: bool = True
    active: bool = True

    class Settings:
        name = "users"
