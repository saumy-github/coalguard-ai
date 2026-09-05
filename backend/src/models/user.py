from typing import Literal, Optional

from beanie import Document, PydanticObjectId

UserType = Literal[
    "worker",
    "safety_officer",
    "corporate_manager",
    "regulator",
    "admin",
]


class User(Document):
    email: Optional[str] = None
    phone: Optional[str] = None
    password_hash: Optional[str] = None
    google_id: Optional[str] = None
    role: UserType
    # Legacy scope fields from the pre-Decision-#12 model. No longer read by any
    # route (MineAssignment replaces them) — kept only until every caller has
    # migrated, per Decision #12's rollout sequence, then deleted.
    mine_id: Optional[PydanticObjectId] = None
    subsidiary_id: Optional[PydanticObjectId] = None
    full_name: Optional[str] = None
    role_title: Optional[str] = None
    is_guest: bool = False
    active: bool = True

    class Settings:
        name = "users"
