from ..models.inspection import Inspection, Observation
from ..models.user import User, get_profile
from ..schemas.inspections import ObservationIn
from .org_service import ensure_placeholder_mine


async def create_manual_observation(user: User, payload: ObservationIn) -> Inspection:
    mine_id = get_profile(user).mine
    if mine_id is None:
        # Worker not yet assigned to a mine — fall back to the shared placeholder.
        mine = await ensure_placeholder_mine()
        mine_id = mine.id

    observation = Observation(
        description=payload.description,
        pillar=payload.pillar,
        photo_urls=payload.photo_urls,
        voice_note_url=payload.voice_note_url,
        lat=payload.lat,
        lng=payload.lng,
        captured_at=payload.captured_at,
    )
    inspection = Inspection(
        mine_id=mine_id,
        source="manual",
        worker_id=user.id,
        observations=[observation],
    )
    await inspection.insert()
    return inspection
