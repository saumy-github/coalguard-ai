from datetime import datetime, timezone

from beanie import PydanticObjectId

from ..models.mine_assignment import MineAssignment
from ..models.user import User


async def ensure_mine_assignment(user: User, mine_id: PydanticObjectId) -> MineAssignment:
    """Idempotent: creates the assignment if missing, reactivates it if it was
    revoked, otherwise leaves it untouched. Shared by scripts/seed_users.py and
    auth/guest.py so a re-run of either never leaves an existing seeded user
    without the MineAssignment their routes now require.
    """
    existing = await MineAssignment.find_one(
        MineAssignment.user_id == user.id, MineAssignment.mine_id == mine_id
    )
    if existing:
        if not existing.active:
            existing.active = True
            existing.revoked_at = None
            await existing.save()
        return existing

    assignment = MineAssignment(user_id=user.id, mine_id=mine_id, role=user.role)
    await assignment.insert()
    return assignment
