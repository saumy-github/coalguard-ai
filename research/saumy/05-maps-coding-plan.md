# Maps — Coding Plan

> **Last updated:** 2026-09-04 (uncommitted — not yet pushed, exists only in this local working tree) ·
**Status:** PLAN — awaiting your review before any code is written. Implements `research/saumy/04-maps-plan.md`. No code has been written yet — this file only lays out phases/steps.

Same relationship to `04-maps-plan.md` as `07-issue-collections-coding-plan.md` has to `06-issue-collections-plan.md` — that one design decisions, this one concrete file-level steps. Each phase is independently checkable before moving to the next.

All file paths follow the existing `backend/src` structure (`models/`, `schemas/`, `services/`, `routes/`, registered in `main.py`), same conventions as `07`'s plan.

---

## Phase 0 — `MineLevel` model + seed data

**Goal**: the confirmed layout (`04`) exists as real data, nothing else yet.

1. `backend/src/models/mine_level.py` — `MineLevel(Document)`: `mine_id` (ref → Mine), `level` (str), `section_count` (int), `Settings.name = "mine_levels"`.
2. Update `backend/src/models/__init__.py` — add `MineLevel` to `ALL_MODELS`/`__all__`.
3. Seed the confirmed demo data (wherever the placeholder `Mine`/`Subsidiary` seeding already happens, e.g. `backend/scripts/seed_users.py`'s `ensure_placeholder_org()`, per `04-domain-models-and-dashboards-plan.md`'s existing seed-script pattern) — three `MineLevel` rows for the one seeded mine: `A`/20, `B`/15, `C`/10.

**Checkpoint**: rebuild the backend container, run the seed step, confirm the three `MineLevel` documents exist in Mongo (`docker exec` + a quick `mongosh` query, or via Phase 1's endpoint once it exists).

---

## Phase 1 — Read endpoint

**Goal**: the layout is fetchable over HTTP.

1. `backend/src/schemas/mine_levels.py` — `MineLevelResponse` (`level`, `section_count`).
2. `backend/src/services/mine_level_service.py` — `list_mine_levels(mine_id)`.
3. `backend/src/routes/mine_levels.py` — `GET /mine-levels`, scoped to the caller's `mine_id` from the JWT (never client-supplied, same principle stated throughout `lld.md` §3 and `07`'s plan).
4. Register the router in `main.py`.

**Checkpoint**: via `/docs`, call `GET /mine-levels` as a seeded user, confirm it returns the three rows from Phase 0 in the right shape.

---

## Phase 2 — Frontend: underground map view

**Goal**: the confirmed plain-CSS-grid rendering (`04`) exists and shows the real layout.

1. New component (e.g. `frontend/src/components/MineLevelMap.tsx`) — fetches `GET /mine-levels`, renders one row per level (`A` at top), each row a CSS grid of `section_count` numbered cells. No mapping/charting library, per `04`'s confirmed decision.
2. Fetch `GET /person-issues` + `GET /site-issues` (from `07`'s Phase 1 — **this phase depends on that one already existing**), group client-side by `level`/`section`, badge/color any cell that has an open issue.
3. Clicking a badged cell shows the issue(s) at that location — reuses whatever detail view `07`'s Phase 4 (frontend wiring) produces. If that hasn't been built yet when this phase is reached, a plain inline list (no dedicated detail component) is an acceptable placeholder — don't build a second detail view speculatively.
4. Delete `WorkerDashboard.tsx`'s current fake `renderMap` block (`components/views/WorkerDashboard.tsx:480`, confirmed in `04` as being replaced, not extended) and wire in `MineLevelMap`.

**Checkpoint**: with only Phase 0/1 data seeded (no issues yet), confirm the map renders all 45 cells (20+15+10) across 3 rows with nothing highlighted. Then create one `SiteIssue` at a known `level`/`section` (via `07`'s manual-create endpoint, or directly in Mongo if `07` isn't built yet) and confirm that exact cell highlights and nothing else does.

---

## Phase 3 — Issue-creation forms read from `MineLevel`

**Goal**: `level`/`section` inputs become real dropdowns instead of free text, per `04`'s "Dependency on the issues plan" section.

1. Wherever `07`'s Phase 4 builds the manual issue-creation form(s), replace the free-text `level`/`section` inputs with a dropdown sourced from `GET /mine-levels` (level choices, then section choices 1..`section_count` for whichever level is picked).

**This phase explicitly depends on `07`'s Phase 1 (issue endpoints) and Phase 4 (frontend forms) existing already** — sequence it after both, not in parallel.

**Checkpoint**: attempt to submit a `section` value beyond a level's `section_count` through the UI, confirm the dropdown makes it impossible rather than relying on backend validation to reject it.

---

## What's explicitly out of scope for this coding plan

Per `04`'s own scope: section shape/geometry, a `MineLevel` admin CRUD UI (seeded only, not admin-managed), and the surface/country maps (blocked on `Mine.lat`/`lng`/`boundary_geojson`, which don't exist — separate work entirely, not attempted here).

---

## Sequence recap

1. Phase 0 — `MineLevel` model + seed data.
2. Phase 1 — `GET /mine-levels`, verified via `/docs`.
3. Phase 2 — underground map view, verified against seeded-but-empty data, then against one real issue.
4. Phase 3 — issue-creation forms wired to real dropdowns, done only after `07`'s Phase 1 and Phase 4 are both in place.

---

## Execution Log (2026-09-04)

### Phase 0 — done, verified

- `backend/src/models/mine_level.py` — `MineLevel(Document)` created exactly as specced.
- `backend/src/models/__init__.py` — registered in `ALL_MODELS`.
- `backend/scripts/seed_users.py` — added `DEMO_MINE_LEVELS` and idempotent seeding inside `ensure_placeholder_org()`.
- Ran `docker exec sih26-backend-1 python -m scripts.index` against the live container. Output: `Seeded 3 MineLevel rows for Test Mine`, all 5 test users skipped (already existed) — confirms idempotency didn't touch unrelated data.
- Backend's `--reload` picked up all new files with no import/startup errors (checked `docker logs sih26-backend-1` — clean reload cycles, `Application startup complete` each time).

### Phase 1 — done, verified end-to-end

- `backend/src/schemas/mine_levels.py`, `backend/src/services/mine_level_service.py`, `backend/src/routes/mine_levels.py` created per plan; router registered in `main.py`.
- Logged in as the seeded worker (`POST /auth/login`, phone `9990000001`), called `GET /mine-levels` with the resulting JWT:
  ```json
  [{"level": "A", "section_count": 20}, {"level": "B", "section_count": 15}, {"level": "C", "section_count": 10}]
  ```
  Matches the confirmed demo data exactly.
- RBAC verified: same call as `admin@example.com` → `403`; same call with no `Authorization` header at all → `403` (FastAPI's `HTTPBearer(auto_error=True)` returns 403 for a missing header, not 401 — that's existing behavior shared with every other authenticated route in this codebase, not something new introduced here).

### Phase 2 — done, verified except live browser interaction

- `frontend/src/components/MineLevelMap.tsx` created: fetches `GET /mine-levels`, renders one row per level as a CSS grid of numbered cells (Tailwind, no library), overlays red highlighting for any `level`+`section` with an open issue.
- `WorkerDashboard.tsx`'s fake `renderMap` block (the old hardcoded "Surface/-150m/-320m" decorative diagram) deleted entirely and replaced with `<MineLevelMap />`.
- `npx tsc --noEmit` — clean, no errors.
- `npx vite build` — clean production build (1768 modules, no errors).
- Dev server smoke test (`vite` on a scratch port) — served the SPA shell with HTTP 200.
- **Not verified**: actual interactive browser testing (logging in, clicking the Map tab, visually confirming the grid renders and a highlighted cell appears) — no browser-automation tool was available in this session. Type-check, build, and API-level checks all pass, but this falls short of the "use the feature in a browser" bar for UI changes. Recommend a manual check before considering this phase fully closed.
- **Expected, not a bug**: `GET /person-issues`/`GET /site-issues` don't exist yet (`07` isn't built) — the component's fetch for those fails and is caught silently, so the grid renders with nothing highlighted until `07` exists. This is exactly the behavior `05`'s Phase 2 checkpoint anticipated ("if `07` isn't built yet").

### Phase 3 — not implemented, correctly blocked

Per the plan's own dependency note: this phase requires `07`'s Phase 1 (issue endpoints) and Phase 4 (frontend issue-creation forms) to already exist. Neither does — `07` hasn't been coded yet, and `WorkerDashboard.tsx`'s "Report a Problem" form still submits to the old mock `dashboardDataStore.addTicket`, not any real endpoint. There is no existing dropdown-free form to retrofit. Left undone rather than fabricating a new issue-creation form out of scope for this plan.

### Net result

Phases 0, 1, and 2 are code-complete and verified at the API/build level. Phase 2 still wants a real browser click-through before fully trusting it. Phase 3 is blocked on `07` and should be picked up once that plan is built.
