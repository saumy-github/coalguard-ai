from fastapi import APIRouter, Depends

from ..auth.dependencies import require_user_types
from ..models.inspection import Inspection
from ..models.user import User
from ..schemas.inspections import InspectionResponse, ObservationIn
from ..services import inspection_service

router = APIRouter(prefix="/inspections", tags=["inspections"])


def _to_response(inspection: Inspection) -> InspectionResponse:
    return InspectionResponse(
        id=str(inspection.id),
        mine_id=str(inspection.mine_id) if inspection.mine_id else None,
        source=inspection.source,
        worker_id=str(inspection.worker_id),
        created_at=inspection.created_at,
    )


@router.post("/observations", response_model=InspectionResponse)
async def submit_observation(
    payload: ObservationIn,
    user: User = Depends(require_user_types("worker")),
) -> InspectionResponse:
    inspection = await inspection_service.create_manual_observation(user, payload)
    return _to_response(inspection)
