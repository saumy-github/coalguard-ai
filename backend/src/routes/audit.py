from fastapi import APIRouter, Depends, HTTPException, status

from ..auth.dependencies import require_role
from ..models.user import User
from ..services.audit_service import (
    LedgerError,
    RecordNotFound,
    anchor_record,
    get_record_history,
    verify_record,
)

router = APIRouter(prefix="/audit", tags=["audit"])


@router.post("/verify/{record_type}/{record_id}")
async def verify(
    record_type: str,
    record_id: str,
    _: User = Depends(require_role("regulator", "admin")),
) -> dict:
    try:
        return await verify_record(record_type=record_type, record_id=record_id)
    except RecordNotFound as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except LedgerError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc


@router.get("/records/{record_type}/{record_id}")
async def records(
    record_type: str,
    record_id: str,
    _: User = Depends(require_role("regulator", "admin")),
) -> list[dict]:
    try:
        return await get_record_history(record_type=record_type, record_id=record_id)
    except LedgerError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc


@router.post("/anchor/{record_type}/{record_id}")
async def anchor(
    record_type: str,
    record_id: str,
    _: User = Depends(require_role("admin")),
) -> dict:
    # Manual anchor trigger — makes the demo scriptable without waiting on
    # whatever background trigger normally fires it. Always 200: anchor_record
    # swallows failures into {"status": "unavailable", ...} by design.
    return await anchor_record(record_type=record_type, record_id=record_id)
