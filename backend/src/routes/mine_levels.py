from fastapi import APIRouter, Depends

from ..auth.dependencies import require_mine_assignment, require_role
from ..models.mine_level import MineLevel
from ..models.user import User
from ..schemas.mine_levels import MineLevelResponse
from ..services import mine_level_service

router = APIRouter(prefix="/mine-levels", tags=["mine-levels"])


def _to_response(mine_level: MineLevel) -> MineLevelResponse:
    return MineLevelResponse(level=mine_level.level, section_count=mine_level.section_count)


@router.get("", response_model=list[MineLevelResponse])
async def list_mine_levels(
    user: User = Depends(require_role("worker", "safety_officer")),
) -> list[MineLevelResponse]:
    mine_levels = await mine_level_service.list_mine_levels(await require_mine_assignment(user))
    return [_to_response(mine_level) for mine_level in mine_levels]
