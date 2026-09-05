from datetime import datetime, timezone
from typing import Optional

from beanie import PydanticObjectId
from fastapi import APIRouter, Depends, HTTPException, status

from ..auth.dependencies import require_role
from ..models.mine_assignment import MineAssignment
from ..models.user import User
from ..schemas.mine_assignments import CreateMineAssignmentRequest, MineAssignmentResponse
from ..services.mine_assignment_service import ensure_mine_assignment

router = APIRouter(prefix="/mine-assignments", tags=["mine-assignments"])


def _to_response(assignment: MineAssignment) -> MineAssignmentResponse:
    return MineAssignmentResponse(
        id=str(assignment.id),
        user_id=str(assignment.user_id),
        mine_id=str(assignment.mine_id),
        role=assignment.role,
        active=assignment.active,
    )


@router.get("", response_model=list[MineAssignmentResponse], dependencies=[Depends(require_role("admin"))])
async def list_mine_assignments(user_id: Optional[str] = None) -> list[MineAssignmentResponse]:
    query = MineAssignment.find(MineAssignment.active == True)  # noqa: E712
    if user_id:
        query = MineAssignment.find(
            MineAssignment.user_id == PydanticObjectId(user_id), MineAssignment.active == True  # noqa: E712
        )
    assignments = await query.to_list()
    return [_to_response(a) for a in assignments]


@router.post("", response_model=MineAssignmentResponse, dependencies=[Depends(require_role("admin"))])
async def create_mine_assignment(payload: CreateMineAssignmentRequest) -> MineAssignmentResponse:
    user = await User.get(PydanticObjectId(payload.user_id))
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    assignment = await ensure_mine_assignment(user, PydanticObjectId(payload.mine_id))
    return _to_response(assignment)


@router.delete("/{assignment_id}", dependencies=[Depends(require_role("admin"))])
async def revoke_mine_assignment(assignment_id: str) -> dict:
    assignment = await MineAssignment.get(PydanticObjectId(assignment_id))
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")
    assignment.active = False
    assignment.revoked_at = datetime.now(timezone.utc)
    await assignment.save()
    return {"status": "revoked"}
