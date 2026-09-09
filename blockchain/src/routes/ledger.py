from fastapi import APIRouter, Depends, HTTPException, status

from ..auth import require_api_key
from ..canonical import CanonicalizationError
from ..chain import ChainUnavailable
from ..config import settings
from ..models.ledger_entry import LedgerEntryStatus
from ..schemas import (
    AnchorBatchRequest,
    AnchorRequest,
    AnchorResponse,
    EntryResponse,
    VerifyRequest,
)
from ..services import ledger_service, onchain_service, verify_service

router = APIRouter(prefix="/api/ledger", tags=["ledger"])


def _entry_response(entry) -> EntryResponse:
    return EntryResponse.from_entry(entry, etherscan_base_url=settings.etherscan_base_url)


@router.post("/anchor", response_model=AnchorResponse, status_code=status.HTTP_202_ACCEPTED)
async def anchor(payload: AnchorRequest, _: None = Depends(require_api_key)) -> AnchorResponse:
    try:
        entry, existing = await ledger_service.enqueue_anchor(**payload.model_dump())
    except CanonicalizationError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    return AnchorResponse(
        entry_id=str(entry.id), payload_hash=entry.payload_hash, status=entry.status, existing=existing
    )


@router.post("/anchor/batch", response_model=list[AnchorResponse])
async def anchor_batch(
    payload: AnchorBatchRequest, _: None = Depends(require_api_key)
) -> list[AnchorResponse]:
    try:
        results = await ledger_service.enqueue_anchor_batch(
            [item.model_dump() for item in payload.items]
        )
    except CanonicalizationError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    return [
        AnchorResponse(entry_id=str(e.id), payload_hash=e.payload_hash, status=e.status, existing=ex)
        for e, ex in results
    ]


@router.post("/verify")
async def verify(payload: VerifyRequest) -> dict:
    # Deliberately open (no API key): this is the demo endpoint a regulator or
    # a judge should be able to hit directly.
    try:
        return await verify_service.verify_record(**payload.model_dump())
    except CanonicalizationError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc


@router.get("/entries/{entry_id}", response_model=EntryResponse)
async def get_entry(entry_id: str) -> EntryResponse:
    entry = await ledger_service.get_entry(entry_id)
    if entry is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="entry not found")
    return _entry_response(entry)


@router.get("/entries", response_model=list[EntryResponse])
async def list_entries(status_: LedgerEntryStatus | None = None, limit: int = 50) -> list[EntryResponse]:
    entries = await ledger_service.list_entries(status=status_, limit=limit)
    return [_entry_response(e) for e in entries]


@router.post("/entries/{entry_id}/retry", response_model=EntryResponse)
async def retry_entry(entry_id: str, _: None = Depends(require_api_key)) -> EntryResponse:
    entry = await ledger_service.retry_entry(entry_id)
    if entry is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="entry not found or not in a retryable (failed) state",
        )
    return _entry_response(entry)


@router.get("/records/{record_type}/{record_id}", response_model=list[EntryResponse])
async def get_record_history(record_type: str, record_id: str) -> list[EntryResponse]:
    entries = await ledger_service.get_record_history(record_type=record_type, record_id=record_id)
    return [_entry_response(e) for e in entries]


@router.get("/records/{record_type}/{record_id}/onchain")
async def get_record_onchain(record_type: str, record_id: str) -> dict:
    # RPC only — deliberately never touches this service's own database. See
    # onchain_service.py's module docstring.
    try:
        return await onchain_service.get_record_onchain(record_type=record_type, record_id=record_id)
    except ChainUnavailable as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc


@router.get("/mines/{mine_id}/onchain")
async def get_mine_records_onchain(mine_id: str, offset: int = 0, limit: int = 100) -> dict:
    try:
        return await onchain_service.get_mine_records_onchain(mine_id=mine_id, offset=offset, limit=limit)
    except ChainUnavailable as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc


@router.get("/stats")
async def stats() -> dict:
    return await ledger_service.stats()
