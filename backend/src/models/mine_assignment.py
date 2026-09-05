from datetime import datetime, timezone
from typing import Optional

from beanie import Document, PydanticObjectId
from pydantic import Field

from .user import UserType


class MineAssignment(Document):
    """Where a user's role applies — Decision #12
    (research/saumy/09-changes-5-sep.md). `role` mirrors the owning User's role
    at assignment time so scope checks can query this collection alone, without
    a join back to `users` for every request.
    """

    user_id: PydanticObjectId
    mine_id: PydanticObjectId
    role: UserType
    active: bool = True
    assigned_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    revoked_at: Optional[datetime] = None

    class Settings:
        name = "mine_assignments"
