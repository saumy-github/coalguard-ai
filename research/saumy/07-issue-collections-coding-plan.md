# PersonIssue / SiteIssue — Coding Plan

> **Last updated:** 2026-09-04 (uncommitted — not yet pushed, exists only in this local working tree) ·
**Status:** PLAN — awaiting your review before any code is written. Implements `research/saumy/06-issue-collections-plan.md`. No code has been written yet — this file only lays out phases/steps. Numbered after `04-maps-plan.md` — maps needs its own decisions settled first since the underground map view is how `level`/`section` data (raised here) actually gets seen; build `04` before this one.

Each phase is independently runnable and demoable before moving to the next — per the "build bottom-up, expect the plan to change" approach from `06-issue-collections-plan.md`. Don't start phase *N+1* until phase *N* actually works against the live containers.

All file paths below follow the existing `backend/src` structure (verified by reading it): `models/` (Beanie Documents, registered in `models/__init__.py`'s `ALL_MODELS`), `schemas/` (Pydantic request/response DTOs), `services/` (business logic, one file per concern), `routes/` (thin FastAPI routers, RBAC via `Depends(require_user_types(...))`), matching exactly how `user.py`/`users.py`/`user_service.py`/`auth.py` are already wired together.

---

## Phase 0 — Models

**Goal**: `PersonIssue` and `SiteIssue` exist as real Beanie collections, nothing else yet.

1. `backend/src/models/person_issue.py` — `PersonIssue(Document)`, fields exactly per `06-issue-collections-plan.md`'s table (`worker_id`, `mine_id`, `level`, `section`, `issue_type`, `source`, `observation`, `photo_url`, `severity`, `status`, `created_at`), `Settings.name = "person_issues"`.
2. `backend/src/models/site_issue.py` — `SiteIssue(Document)`, same treatment, `Settings.name = "site_issues"`.
3. Update `backend/src/models/__init__.py` — add both to `ALL_MODELS` and `__all__`, same pattern as `Mine`/`Subsidiary`.

**Checkpoint**: rebuild the backend container, hit `/health`, confirm no import/startup errors. No endpoints exist yet — this phase is purely "the collections exist and the app still boots."

---

## Phase 1 — Manual raise + list (no `ai_engine` involved)

**Goal**: a person can file an issue by hand and see a list of them. This alone satisfies "a system where we can raise issues" — everything after this is automation on top.

1. `backend/src/schemas/person_issues.py` — `CreatePersonIssueRequest` (everything except `mine_id`, which comes from the caller's JWT, not the request body — same "never trust client-supplied scope" principle `lld.md` §3 already states), `PersonIssueResponse`.
2. `backend/src/schemas/site_issues.py` — same shape, for `SiteIssue`.
3. `backend/src/services/person_issue_service.py` — `create_person_issue(...)`, `list_person_issues(mine_id)`. Every query scoped by the caller's `mine_id`, matching the pattern already stated for the rest of the codebase.
4. `backend/src/services/site_issue_service.py` — same, for `SiteIssue`.
5. `backend/src/routes/person_issues.py` — `POST /person-issues`, `GET /person-issues`, thin handlers calling the service, `_to_response` mapper — same shape as `routes/users.py`.
6. `backend/src/routes/site_issues.py` — same, for `SiteIssue`.
7. Register both routers in `main.py` (`app.include_router(...)`), same as `auth_router`/`users_router`.

**RBAC — confirmed**: `mine_safety_officer` can manually file either `PersonIssue` or `SiteIssue`; `worker` can manually file `SiteIssue` only (the "Report a Problem" use case) — not `PersonIssue`. `GET` (list) open to both roles, scoped to their own `mine_id`.

**Checkpoint**: via `/docs` (FastAPI's own Swagger UI, already live at `localhost:8000/docs`) or `curl`, manually create a `PersonIssue` and a `SiteIssue`, then list them back. No `ai_engine` call happens anywhere in this phase.

---

## Phase 2 — Wire the CV path (`PersonIssue` auto-creation)

**Goal**: a camera image in, an auto-created `PersonIssue` out, when PPE is missing.

1. `backend/src/services/ai_engine_client.py` (new, shared by this phase and phase 3) — thin HTTP wrapper around `ai_engine`'s base URL (from `config.py`), one function per endpoint it calls. Keeps the actual `httpx`/`requests` call in one place instead of scattered across services.
2. Extend `person_issue_service.py` — `create_person_issue_from_detection(image_bytes, mine_id, level, section)`: calls `ai_engine_client.detect_ppe(image_bytes)`, and if `violation_detected`, maps the response per `06`'s mapping table (`helmet_count==0` → `no_helmet`, etc.) into a `PersonIssue` with `source=camera`.
3. `routes/person_issues.py` — add `POST /person-issues/detect` (multipart image upload + `level`/`section` in the request, since `Asset` doesn't carry location yet — see the flagged dependency in `06`). Returns the created `PersonIssue`, or a 204/no-op response if no violation was detected.

**Confirmed out of scope**: `mine_id`/`level`/`section` are supplied by the caller in this phase rather than looked up from the camera `Asset` — `Asset`/camera location is explicitly not being built as part of this plan (per `06`'s Future Scope). Fine for a demo where you know which camera is calling; revisit only when `Asset` location becomes its own piece of work.

**Checkpoint**: upload a real image with a person missing a helmet through `/person-issues/detect`, confirm a `PersonIssue` with `source=camera` shows up in the Phase 1 list endpoint. Upload an image where PPE is fully present, confirm nothing gets created.

---

## Phase 3 — Wire the anomaly path (`SiteIssue` auto-creation)

**Goal**: a sensor reading in, an auto-created `SiteIssue` out, only when it's actually abnormal.

1. Extend `ai_engine_client.py` — `check_anomaly(methane, co, air_velocity, temperature)`.
2. Extend `site_issue_service.py` — `create_site_issue_from_reading(...)`: calls the anomaly endpoint, and **only creates a `SiteIssue` if `overall_risk != "NORMAL"`** — this is the flood-control minimum from `06`, not optional. Maps `overall_risk` → `severity`, `sensor_reports` → `sensor_reading_snapshot`. `recommended_action` is authored here as simple rule logic (e.g. a lookup keyed on which sensor + risk level triggered), not returned by `ai_engine`.
3. `routes/site_issues.py` — add `POST /site-issues/detect` (methane/co/air_velocity/temperature + `mine_id`/`level`/`section` in the request body, same confirmed-out-of-scope shortcut as Phase 2 — no live telemetry source exists yet either, so this is invoked on-demand, not streamed).

**Checkpoint**: call `/site-issues/detect` with values inside normal range, confirm no `SiteIssue` is created. Call it with a methane value above the critical threshold (per `predictive_engine.py`'s `SENSOR_THRESHOLDS`, that's ≥1.5%), confirm a `SiteIssue` with `severity=CRITICAL` is created.

---

## Phase 4 — Frontend wiring

**Goal**: the existing mock UI actually calls the real endpoints.

1. `WorkerDashboard.tsx`'s "Report a Problem" (`handleReportSubmit`) → `POST /site-issues` (manual), replacing the mock `dashboardDataStore.addTicket` call — per Phase 1's RBAC assumption, this is a `SiteIssue`, not a `PersonIssue`.
2. A list view (Worker and/or Safety Officer dashboard — exact placement TBD) → `GET /person-issues` + `GET /site-issues`, replacing whatever mock ticket/task list currently stands in.
3. Not in this phase: `PPEAlerts` page (Phase 2's camera path), `LiveTelemetry`/sensor-triggered UI (Phase 3's path needs a real telemetry source first, per `06`'s Future Scope) — both wait until their backend half is confirmed working.

This phase is intentionally vague on exact component-level detail — worth its own short discussion once Phases 0–3 are actually built and you've seen the real response shapes.

---

## What's explicitly out of scope for this coding plan

Everything listed under `06-issue-collections-plan.md`'s **Future Scope**: flooding beyond the one `NORMAL`-filter in Phase 3, the corrective-action/`Ticket` workflow, blockchain audit ledger, the live telemetry/WebSocket pipeline, `Asset` location fields, and reconciling `lld.md`. None of these are needed for "a system where we can raise issues" to work end-to-end.

---

## Sequence recap

1. Phase 0 — models.
2. Phase 1 — manual create/list, verified via `/docs` before moving on.
3. Phase 2 — CV detection wired in, verified against a real image.
4. Phase 3 — anomaly detection wired in, verified against both a normal and a critical reading.
5. Phase 4 — frontend wiring, once 0–3 are confirmed solid.

---

## Execution Log (2026-09-04)

### Phase 0 — done, verified

- `backend/src/models/person_issue.py`, `backend/src/models/site_issue.py` created exactly per `06`'s field tables — `Literal` type aliases for `issue_type`/`source`/`severity`/`status`, matching the existing `user.py` convention.
- Registered both in `models/__init__.py`'s `ALL_MODELS`.
- Container rebuilt (needed anyway for Phase 2's `httpx` dependency — see below), `/health` clean, no import/startup errors.

### Phase 1 — done, verified, and a real bug found + fixed along the way

- `schemas/person_issues.py`, `schemas/site_issues.py`, `services/person_issue_service.py`, `services/site_issue_service.py`, `routes/person_issues.py`, `routes/site_issues.py` created; both routers registered in `main.py`.
- **Bug found during verification**: the first test — officer creates a `PersonIssue`, worker creates a `SiteIssue`, each should see the other's on `GET` since they share a mine — failed. Both showed empty lists, and the officer's created record had a `mine_id` unrelated to the real "Test Mine". Root cause, traced via `mongosh`: the seeded `mine_safety_officer` test user has `mine_id: null` in the DB (a pre-existing gap in `seed_users.py`, not something this plan introduced — it only ever set `mine_id` for `user_type == "worker"`, contradicting `lld.md` §3's "Mine Safety Officer: one mine" scope). My route code used `user.mine_id` directly, and a required `PydanticObjectId` field **silently accepted `None` and fabricated a random new ObjectId** instead of raising — so the officer's issue got written with garbage, unrelated `mine_id` data instead of erroring.
- **Fixes applied**:
  1. Added `require_mine_scope(user)` to `auth/dependencies.py` — raises `400` if `user.mine_id is None` instead of letting it silently corrupt data. Applied to all 6 endpoints across `person_issues.py`/`site_issues.py`, and retrofitted into `mine_levels.py` (which had the same check written inline, now shared).
  2. Fixed `seed_users.py`'s scoping logic — `mine_id` now set for both `worker` and `mine_safety_officer` per `lld.md` §3; `subsidiary_id` set only for `corporate_management`. `regulatory_authority`/`admin` correctly get neither (cross-mine/global scope).
  3. Corrected the already-seeded officer's `mine_id` directly in Mongo (idempotent seeding skips existing users, so the code fix alone wouldn't retroactively repair the live document) and deleted the one bogus `PersonIssue` created during the bug.
- **Re-verified after the fix**: officer creates a `PersonIssue`, worker creates a `SiteIssue`, both now correctly see each other's records via `GET` (same `mine_id`). RBAC confirmed: worker → `POST /person-issues` → `403` (correctly blocked); officer → allowed. Both roles can `POST`/`GET /site-issues`.

### Phase 2 — done, partially verified

- `services/ai_engine_client.py` created — `detect_ppe()` posts multipart to `/api/cv/detect` (field name `file`, confirmed against `ai_engine/src/main.py`'s actual route signature, not guessed).
- Added `httpx==0.27.0` to `requirements.txt` (no HTTP client existed in the backend before this), `ai_engine_url` to `config.py`, `AI_ENGINE_URL=http://ai_engine:8000` to `.env`/`.env.example` (confirmed reachable via Docker's internal DNS by exec'ing into the backend container and curling it directly before wiring anything).
- `person_issue_service.create_person_issue_from_detection()` and `POST /person-issues/detect` (multipart, `level`/`section` as `Form(...)` fields — required for a multipart request, an earlier draft had this wrong as plain scalar params, fixed before testing) added.
- **Verified**: a synthetic blank test image through the real pipeline (`backend → ai_engine → back`) returns `null` with no `PersonIssue` created — confirms the "no violation" path end-to-end, including the full request/response contract.
- **Not verified**: the "violation detected → `PersonIssue` created" branch. No test image containing a person missing PPE was available in this repo, and fetching one from the internet wasn't attempted. The mapping logic (`helmet_count==0` → `no_helmet`, etc.) was checked by reading `cv_engine.py`'s actual `CVDetectionResult` dataclass, not exercised end-to-end. Worth a manual test with a real photo before trusting this branch fully.

### Phase 3 — done, fully verified

- `ai_engine_client.check_anomaly()`, `site_issue_service.create_site_issue_from_reading()`, `POST /site-issues/detect` added, using a proper `DetectSiteIssueRequest` Pydantic body (an earlier draft used dangling query params for a POST — fixed before testing).
- **Verified both checkpoint cases exactly as specified**: a normal reading (methane 0.3%) → `null`, no `SiteIssue` created. A critical reading (methane 1.8%, above the 1.5% threshold in `predictive_engine.py`) → `SiteIssue` created with `severity="CRITICAL"`, `issue_type="high_methane"`, `sensor_reading_snapshot` holding the full per-sensor breakdown, and `recommended_action` correctly generated from the rule-lookup table.

### Phase 4 — done, verified at build level + live traffic observed

- Reworked `WorkerDashboard.tsx`'s "Report a Problem" form: `Category`/`Location` free-text fields replaced with `Issue Type` (real `SiteIssueType` enum), `Level` (A/B/C select), `Section` (number) — matching the real `SiteIssue` schema. `Severity` now offers `WARNING`/`CRITICAL` (real `SiteIssueSeverity` values) instead of the old mock `low/medium/high/critical` scale.
- `handleReportSubmit` now calls `POST /site-issues` for real, with error/success toasts, replacing the mock `dashboardDataStore.addTicket` call. Unused `addTicket` destructure removed.
- Added a "Recent Site Issues" list below the form (`GET /site-issues`, fetched on mount and refreshed after a successful submit) — satisfies Phase 4 item 2's list-view requirement, scoped to the Worker page only (Safety Officer dashboard wiring left for later, per the plan's own "exact placement TBD").
- **Deliberately not done**: `level`/`section` is a static `A`/`B`/`C` select, not wired to `GET /mine-levels` — that dynamic dropdown is `05-maps-coding-plan.md`'s Phase 3, out of scope here.
- `npx tsc --noEmit` — clean. `npx vite build` — clean (1768 modules).
- **Partially verified live**: didn't personally click through the form in a browser this session, but `docker logs sih26-backend-1` shows real `GET /mine-levels`, `GET /person-issues`, `GET /site-issues` calls (200 OK) arriving from the Docker host gateway while this work was in progress — almost certainly the user's own browser tab with the dev server open, actively exercising the new endpoints. Encouraging, but not the same as a deliberate click-through test — worth confirming the actual submit flow works end-to-end in the browser.

### Net result

All 5 phases are code-complete. Phases 0, 1, and 3 are fully verified end-to-end. Phase 2 is verified for the "no violation" path only. Phase 4 is verified at the type-check/build level with live GET traffic observed, but the submit flow itself hasn't been manually clicked through. One real bug (silent `mine_id` fabrication) was found and fixed during verification, along with its root cause in `seed_users.py` — both worth knowing about since they'd have caused confusing, hard-to-trace data corruption in a demo otherwise.
