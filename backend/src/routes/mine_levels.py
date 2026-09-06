from typing import Optional

from beanie import PydanticObjectId
from fastapi import APIRouter, Depends, HTTPException, status

from ..auth.dependencies import accessible_mine_ids, require_mine_assignment, require_role
from ..models.mine_level import MineLevel
from ..models.user import User
from ..schemas.mine_levels import MineLevelResponse
from ..services import mine_level_service

router = APIRouter(prefix="/mine-levels", tags=["mine-levels"])

_SINGLE_MINE_ROLES = {"worker", "safety_officer"}


def _to_response(mine_level: MineLevel) -> MineLevelResponse:
    return MineLevelResponse(
        level=mine_level.level,
        section_count=mine_level.section_count,
        boundary=mine_level.boundary,
        view_box=mine_level.view_box,
        sections=[s.model_dump() for s in mine_level.sections],
    )


@router.get("", response_model=list[MineLevelResponse])
async def list_mine_levels(
    mine_id: Optional[str] = None,
    user: User = Depends(require_role("worker", "safety_officer", "corporate_manager", "regulator", "admin")),
) -> list[MineLevelResponse]:
    if user.role in _SINGLE_MINE_ROLES:
        resolved_mine_id = await require_mine_assignment(user)
    else:
        if not mine_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="mine_id is required")
        resolved_mine_id = PydanticObjectId(mine_id)
        if user.role != "admin" and resolved_mine_id not in await accessible_mine_ids(user):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Mine not in your scope")

    mine_levels = await mine_level_service.list_mine_levels(resolved_mine_id)
    return [_to_response(mine_level) for mine_level in mine_levels]
