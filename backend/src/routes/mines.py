from fastapi import APIRouter, Depends

from ..auth.dependencies import accessible_mine_ids, require_role
from ..models.mine import Mine
from ..models.user import User
from ..schemas.mines import CreateMineRequest, MineResponse
from ..services import mine_service
from ..services.mine_assignment_service import ensure_mine_assignment

router = APIRouter(prefix="/mines", tags=["mines"])


def _to_response(mine: Mine) -> MineResponse:
    return MineResponse(id=str(mine.id), name=mine.name, lat=mine.lat, lng=mine.lng)


@router.get("", response_model=list[MineResponse])
async def list_mines(
    user: User = Depends(require_role("corporate_manager", "regulator", "admin")),
) -> list[MineResponse]:
    if user.role == "admin":
        mines = await mine_service.list_all_mines()
    else:
        mines = await mine_service.list_mines_by_ids(await accessible_mine_ids(user))
    return [_to_response(mine) for mine in mines]


@router.post("", response_model=MineResponse)
async def create_mine(
    payload: CreateMineRequest,
    user: User = Depends(require_role("admin", "corporate_manager")),
) -> MineResponse:
    mine = await mine_service.create_mine(name=payload.name, lat=payload.lat, lng=payload.lng)
    if user.role == "corporate_manager":
        # Decision #14, verbatim: creating a mine automatically grants the
        # creator an active Corporate Management assignment to it.
        await ensure_mine_assignment(user, mine.id)
    return _to_response(mine)
