from datetime import datetime, timezone
import logging
from typing import Any, Dict, List, Optional

from beanie import PydanticObjectId
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
import httpx

from ..auth.dependencies import get_current_user
from ..config import settings
from ..models.attendance import AttendanceRecord
from ..models.mine import Mine
from ..models.mine_assignment import MineAssignment
from ..models.user import User
from ..services.org_service import ECL_MINE_LAT, ECL_MINE_LNG, ECL_MINE_NAME

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/attendance", tags=["attendance"])


def _to_record_dict(record: AttendanceRecord) -> Dict[str, Any]:
    return {
        "id": str(record.id),
        "user_id": str(record.user_id) if record.user_id else None,
        "worker_id": record.worker_id,
        "worker_name": record.worker_name,
        "mine_id": str(record.mine_id) if record.mine_id else None,
        "mine_name": record.mine_name,
        "latitude": record.latitude,
        "longitude": record.longitude,
        "distance_from_site_m": record.distance_from_site_m,
        "status": record.status,
        "liveness": record.liveness,
        "identity": record.identity,
        "selfie_saved": record.selfie_saved,
        "created_at": record.created_at.isoformat(),
    }


@router.post("/mark")
async def mark_attendance(
    files: List[UploadFile] = File(..., description="Camera burst frames for liveness and face match"),
    latitude: float = Form(..., description="Worker's current GPS latitude"),
    longitude: float = Form(..., description="Worker's current GPS longitude"),
    site_lat: Optional[float] = Form(None, description="Optional mine site latitude override"),
    site_lon: Optional[float] = Form(None, description="Optional mine site longitude override"),
    worker_id: Optional[str] = Form(None, description="Optional worker ID override (e.g. 'saumy')"),
    mine_id: Optional[str] = Form(None, description="Optional mine ID"),
    user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """Validate geofence, liveness, and face match via AI Engine, then record attendance."""
    # Resolve worker identifier
    effective_worker_id = worker_id.strip().lower() if worker_id else ""
    if not effective_worker_id:
        if user.full_name:
            effective_worker_id = user.full_name.strip().lower().replace(" ", "_")
        elif user.email:
            effective_worker_id = user.email.split("@")[0].lower()
        else:
            effective_worker_id = str(user.id)

    worker_display_name = user.full_name or effective_worker_id.capitalize()

    # Resolve Mine & Coordinates
    resolved_mine_id: Optional[PydanticObjectId] = None
    resolved_mine_name: str = ECL_MINE_NAME
    resolved_site_lat: float = ECL_MINE_LAT
    resolved_site_lon: float = ECL_MINE_LNG

    target_mine: Optional[Mine] = None
    if mine_id:
        try:
            target_mine = await Mine.get(PydanticObjectId(mine_id))
        except Exception:
            target_mine = None

    if not target_mine:
        # Check user's active mine assignment
        assignment = await MineAssignment.find_one(
            MineAssignment.user_id == user.id, MineAssignment.active == True  # noqa: E712
        )
        if assignment and assignment.mine_id:
            target_mine = await Mine.get(assignment.mine_id)

    if not target_mine and user.mine_id:
        target_mine = await Mine.get(user.mine_id)

    if target_mine:
        resolved_mine_id = target_mine.id
        resolved_mine_name = target_mine.name
        if target_mine.lat is not None and target_mine.lng is not None:
            resolved_site_lat = target_mine.lat
            resolved_site_lon = target_mine.lng

    # Apply manual site coordinate override if provided
    if site_lat is not None and site_lon is not None:
        resolved_site_lat = site_lat
        resolved_site_lon = site_lon

    # Prepare multipart files and data to proxy to AI Engine
    form_data = {
        "worker_id": effective_worker_id,
        "latitude": str(latitude),
        "longitude": str(longitude),
        "site_lat": str(resolved_site_lat),
        "site_lon": str(resolved_site_lon),
    }

    multipart_files = []
    for upload in files:
        content = await upload.read()
        multipart_files.append(
            ("files", (upload.filename or "frame.jpg", content, upload.content_type or "image/jpeg"))
        )

    ai_url = f"{settings.ai_engine_url.rstrip('/')}/api/attendance/mark"
    try:
        async with httpx.AsyncClient(timeout=90.0) as client:
            resp = await client.post(ai_url, data=form_data, files=multipart_files)

    except httpx.RequestError as exc:
        logger.error("Failed to connect to AI Engine at %s: %s", ai_url, exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"AI Attendance Engine is unreachable: {exc}",
        )

    if resp.status_code != 200:
        error_detail = "Attendance verification failed."
        try:
            err_json = resp.json()
            error_detail = err_json.get("detail", error_detail)
        except Exception:
            error_detail = resp.text or error_detail
        raise HTTPException(status_code=resp.status_code, detail=error_detail)

    ai_result = resp.json()

    # Create and persist AttendanceRecord in MongoDB
    record = await AttendanceRecord(
        user_id=user.id,
        worker_id=effective_worker_id,
        worker_name=worker_display_name,
        mine_id=resolved_mine_id,
        mine_name=resolved_mine_name,
        latitude=latitude,
        longitude=longitude,
        distance_from_site_m=float(ai_result.get("distance_from_site_m", 0.0)),
        status="verified",
        liveness=ai_result.get("liveness"),
        identity=ai_result.get("identity"),
        selfie_saved=ai_result.get("selfie_saved"),
    ).insert()

    return {
        "status": "success",
        "attendance_record": _to_record_dict(record),
        "ai_engine": ai_result,
        "message": f"Attendance verified & recorded for {worker_display_name}.",
    }


@router.get("/me")
async def get_my_attendance(user: User = Depends(get_current_user)) -> List[Dict[str, Any]]:
    """Return attendance history for the authenticated user."""
    records = (
        await AttendanceRecord.find(AttendanceRecord.user_id == user.id)
        .sort("-created_at")
        .limit(25)
        .to_list()
    )
    return [_to_record_dict(r) for r in records]


@router.get("/today")
async def get_today_attendance(user: User = Depends(get_current_user)) -> List[Dict[str, Any]]:
    """Return all attendance records marked today (UTC date)."""
    now = datetime.now(timezone.utc)
    start_of_day = datetime(now.year, now.month, now.day, 0, 0, 0, tzinfo=timezone.utc)

    records = (
        await AttendanceRecord.find(AttendanceRecord.created_at >= start_of_day)
        .sort("-created_at")
        .to_list()
    )
    return [_to_record_dict(r) for r in records]


@router.post("/register-face")
async def register_face_proxy(
    worker_id: str = Form(...),
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """Proxy reference photo registration to AI Engine."""
    content = await file.read()
    ai_url = f"{settings.ai_engine_url.rstrip('/')}/api/attendance/register-face"

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                ai_url,
                data={"worker_id": worker_id},
                files={"file": (file.filename or "face.jpg", content, file.content_type or "image/jpeg")},
            )
    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"AI Attendance Engine is unreachable: {exc}",
        )

    if resp.status_code != 200:
        detail = resp.text
        try:
            detail = resp.json().get("detail", detail)
        except Exception:
            pass
        raise HTTPException(status_code=resp.status_code, detail=detail)

    return resp.json()
