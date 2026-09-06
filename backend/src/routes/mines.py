from fastapi import APIRouter, Depends

from ..auth.dependencies import accessible_mine_ids, require_role
from ..models.mine import Mine
from ..models.user import User, get_profile, set_profile
from ..schemas.mines import CreateMineRequest, MineResponse
from ..services import mine_service

router = APIRouter(prefix="/mines", tags=["mines"])


def _to_response(mine: Mine) -> MineResponse:
    return MineResponse(id=str(mine.id), name=mine.name, lat=mine.lat, lng=mine.lng)


@router.get("/public", response_model=list[MineResponse])
async def list_mines_public() -> list[MineResponse]:
    """Unauthenticated — name/coordinates only, for the pre-login landing page."""
    mines = await mine_service.list_all_mines()
    return [_to_response(mine) for mine in mines]


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
        # Creating a mine automatically grants the creator access to it.
        profile = get_profile(user)
        if mine.id not in profile.mines:
            profile.mines.append(mine.id)
            set_profile(user, profile)
            await user.save()
    return _to_response(mine)
