from typing import Literal, Optional, Union

from beanie import Document, PydanticObjectId

from .admin_profile import AdminProfile
from .corporate_profile import CorporateProfile
from .officer_profile import OfficerProfile
from .regulator_profile import RegulatorProfile
from .worker_profile import WorkerProfile

UserType = Literal[
    "worker",
    "safety_officer",
    "corporate_manager",
    "regulator",
    "admin",
]

ProfileUnion = Union[WorkerProfile, OfficerProfile, CorporateProfile, RegulatorProfile, AdminProfile]

_PROFILE_CLASS_BY_ROLE: dict[str, type] = {
    "worker": WorkerProfile,
    "safety_officer": OfficerProfile,
    "corporate_manager": CorporateProfile,
    "regulator": RegulatorProfile,
    "admin": AdminProfile,
}


def empty_profile_for_role(role: UserType) -> ProfileUnion:
    return _PROFILE_CLASS_BY_ROLE[role]()


class User(Document):
    email: Optional[str] = None
    phone: Optional[str] = None
    password_hash: Optional[str] = None
    google_id: Optional[str] = None
    role: UserType
    full_name: Optional[str] = None
    active: bool = True
    # Plain dict, not a typed Union field — WorkerProfile/OfficerProfile are
    # shape-identical, so `role` (not the stored shape) decides which class
    # applies; always go through get_profile()/set_profile() below.
    profile: Optional[dict] = None

    class Settings:
        name = "users"


def get_profile(user: User) -> ProfileUnion:
    profile_class = _PROFILE_CLASS_BY_ROLE[user.role]
    return profile_class(**(user.profile or {}))


def set_profile(user: User, profile: ProfileUnion) -> None:
    user.profile = profile.model_dump()
