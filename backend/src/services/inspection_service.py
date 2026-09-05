from ..models.inspection import Inspection, Observation
from ..models.user import User
from ..schemas.inspections import ObservationIn
from .org_service import ensure_placeholder_org


async def create_manual_observation(user: User, payload: ObservationIn) -> Inspection:
    """Worker-submitted Observation from the offline-capable NewInspection flow
    (research/lld.md §7e) — always source="manual", scoped to the calling
    Worker's own mine_id per §3's RBAC rule (never trust a client-supplied
    mine_id, and there isn't one in ObservationIn to begin with).
    """
    mine_id = user.mine_id
    if mine_id is None:
        # Guest/demo Workers and any real Worker not yet assigned to a mine
        # (Mine CRUD, lld.md §7b, doesn't exist yet) still need somewhere to
        # record against — fall back to the shared placeholder mine.
        _, mine = await ensure_placeholder_org()
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
