import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import httpx
from beanie import PydanticObjectId
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from ..auth.dependencies import get_current_user, require_role
from ..models.attendance import AttendanceRecord
from ..models.user import User
from ..services import ai_engine_client

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/attendance", tags=["attendance"])


def _to_record_dict(record: AttendanceRecord) -> Dict[str, Any]:
    return {
        "id": str(record.id),
        "worker_id": str(record.worker_id),
        "mine_id": str(record.mine_id) if record.mine_id else None,
        "selfie_saved": record.selfie_saved,
        "timestamp": record.timestamp.isoformat(),
    }


@router.post("/mark")
async def mark_attendance(
    files: List[UploadFile] = File(..., description="Camera burst frames for liveness and face match"),
    user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """Receive camera burst frames, forward to AI engine for liveness check and
    1-to-N face identification, then persist the attendance record."""
    prepared = []
    for upload in files:
        content = await upload.read()
        prepared.append((upload.filename or "frame.jpg", content, upload.content_type or "image/jpeg"))

    try:
        ai_result = await ai_engine_client.mark_attendance(prepared)
    except httpx.RequestError as exc:
        logger.error("AI engine unreachable during attendance mark: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"AI Attendance Engine is unreachable: {exc}",
        )
    except httpx.HTTPStatusError as exc:
        error_detail = "Attendance verification failed."
        try:
            error_detail = exc.response.json().get("detail", error_detail)
        except Exception:
            error_detail = exc.response.text or error_detail
        rejection_status = (
            status.HTTP_400_BAD_REQUEST
            if exc.response.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)
            else exc.response.status_code
        )
        raise HTTPException(status_code=rejection_status, detail=error_detail)

    matched_worker_id_str = ai_result.get("worker_id")
    if not matched_worker_id_str:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Face not recognised — no matching worker found.",
        )

    try:
        matched_worker_id = PydanticObjectId(matched_worker_id_str)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"AI engine returned an invalid worker_id: {matched_worker_id_str!r}",
        )

    # Resolve mine_id (and display name) for the matched worker
    from ..models.user import User as UserModel, get_profile
    matched_user = await UserModel.get(matched_worker_id)
    resolved_mine_id: Optional[PydanticObjectId] = None
    worker_name: Optional[str] = None
    if matched_user:
        profile = get_profile(matched_user)
        resolved_mine_id = getattr(profile, "mine", None)
        worker_name = matched_user.full_name

    record = await AttendanceRecord(
        worker_id=matched_worker_id,
        mine_id=resolved_mine_id,
        selfie_saved=ai_result.get("selfie_saved"),
    ).insert()

    return {
        "status": "success",
        "attendance_record": _to_record_dict(record),
        "worker_name": worker_name,  # presentation-only, not persisted
        "message": f"Attendance recorded for worker {matched_worker_id_str}.",
    }


@router.get("/me")
async def get_my_attendance(user: User = Depends(require_role("worker"))) -> List[Dict[str, Any]]:
    """Return the authenticated worker's own attendance history (latest 30)."""
    records = (
        await AttendanceRecord.find(AttendanceRecord.worker_id == user.id)
        .sort("-timestamp")
        .limit(30)
        .to_list()
    )
    return [_to_record_dict(r) for r in records]


@router.get("/today")
async def get_today_attendance(user: User = Depends(get_current_user)) -> List[Dict[str, Any]]:
    """Return today's attendance records, scoped by role.
    Worker — only their own records.
    Safety Officer — all records for their mine.
    Admin — unscoped/global.
    """
    now = datetime.now(timezone.utc)
    start_of_day = datetime(now.year, now.month, now.day, 0, 0, 0, tzinfo=timezone.utc)

    base = AttendanceRecord.find(AttendanceRecord.timestamp >= start_of_day)

    if user.role == "admin":
        records = await base.sort("-timestamp").to_list()
    elif user.role == "safety_officer":
        from ..models.user import get_profile
        profile = get_profile(user)
        mine_id = getattr(profile, "mine", None)
        if not mine_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Officer has no mine assigned.",
            )
        records = (
            await base.find(AttendanceRecord.mine_id == mine_id)
            .sort("-timestamp")
            .to_list()
        )
    else:
        # worker — own records only
        records = (
            await base.find(AttendanceRecord.worker_id == user.id)
            .sort("-timestamp")
            .to_list()
        )

    return [_to_record_dict(r) for r in records]
