# Domain Models & Real Dashboards — Bottom-Up Plan

> **Last updated:** 2026-09-03 (uncommitted — not yet pushed, exists only in this local working tree) · 
**Status:** PLAN — awaiting your review before any code changes

Scope: replace mock data with real backend-backed data, bottom-up. Builds on `research/lld.md` §4/§5/§6/§7. This is the **first slice only** — `Mine`/`Asset` models plus the `Ticket`/`Inspection` CAPA loop, wired into the Worker and Safety Officer dashboards. Everything else in `lld.md` (telemetry/WebSockets, production/environment logs, blockchain ledger, certificates, OCR, scheduled reports) is deliberately out of scope here — those become their own plan files once this slice lands, per the priority order agreed in conversation:

1. **This plan**: real `Mine`/`Subsidiary`/`Asset` → real `Ticket`/`Inspection` → Worker + Safety Officer dashboards
2. *(later)* `TelemetryReading` + live monitoring (SafetyOfficerDashboard's sensor panel, `MineMap`)
3. *(later)* `ProductionLog`/`EnvironmentLog` → Corporate + Regulatory dashboards
4. *(later)* Blockchain audit ledger, compliance certificates, OCR, scheduled reports

Corporate, Regulatory, and Admin's Mine-CRUD pages stay on mock data until phase 3/2 above — they need aggregate mine stats (production, compliance score) this plan doesn't build.

---

## Why Ticket/Inspection second, not telemetry

Per `lld.md` §7i/§7l, `ai_engine`'s RAG and predictive-analytics endpoints are **already built** — `backend`'s job is described as "thin": call the endpoint, store the JSON. That makes the CAPA loop (Ticket/Inspection) the highest-value, lowest-effort next step — real functionality, not a new AI subsystem to build. Telemetry needs a live data source (simulated or real) and a WebSocket layer that doesn't exist yet, so it's more work for less immediate payoff.

---

## Phase 1 — Real `Mine` / `Subsidiary` / `Asset` models

Current state: `backend/src/models/mine.py` has placeholder `Mine`/`Subsidiary` (just `name`/`code`/`subsidiary_id`) — created only to give seeded `User`s something to point a `mine_id` at (see `research/saumy/01-auth-completion-plan.md`). Replacing with the real shape from `lld.md` §4:

1. `Subsidiary` — `name`, `code` (unchanged, already matches).
2. `Mine` — add `boundary_geojson` (nullable — no map UI being wired yet, but the field should exist), `ec_annual_cap_tonnes`, `ec_monthly_cap_tonnes`, `location_ping_interval_minutes` (int, default `5`).
3. New `Asset` model — `mine_id`, `type` (camera / sensor / vehicle / conveyor), `label`, `install_date`, `last_maintenance_at`. No CRUD UI for this yet (Admin's `Mines` page is a later phase) — just the model, so `Ticket`/`Inspection` below can reference an asset when relevant (e.g. a manually-filed ticket doesn't need one; a future CV-detected one will).
4. Update `backend/scripts/seed_users.py`'s `ensure_placeholder_org()` to populate the new required-in-spirit fields with sane defaults (real caps and interval, not zeros) so seeded data isn't nonsensical.
5. No `Asset` seeding yet — nothing consumes it this phase.

## Phase 2 — `Ticket` + `Inspection` models & endpoints

**`Ticket`** (`lld.md` §4/§7f), scoped to what this phase actually uses:
- `mine_id`, `source` (`violation` / `cv_detection` / `manual` — only `manual` and `violation` are reachable this phase, `cv_detection` waits for the CV pipeline), `violation_id` (nullable), `created_by` (nullable `User._id`), `severity`, `status` (`open` / `in_progress` / `resolved` / `escalated` — escalation logic itself is a later phase, the field just exists), `assigned_to` (nullable `User._id`), `resolution_photo_urls`, `resolution_notes`, `resolved_by`, `comments: [{author_id, text, at}]`.
- **Decision needed** (see Open Questions): does the existing frontend `category` field (free text, e.g. "Gas Leakage") survive into the real model? `lld.md` doesn't have it — closest concept is `Violation.pillar`. Recommend keeping it as an extra free-text field on `Ticket` since the UI already collects it and it's harmless, rather than forcing today's simple worker-facing form to pick a `pillar` enum it doesn't currently expose.

**`Inspection`** (`lld.md` §4/§7e) — `mine_id`, `source` (`manual` for now — `sensor`/`cv` wait for those pipelines), `worker_id`, `observations: [{description, photo_urls, voice_note_url, lat, lng, pillar}]`, `created_at`. No offline-sync/IndexedDB queue this phase (that's `SyncStatus`, PWA-specific, separate work) — straight online submission only.

**`Violation`** (`lld.md` §4/§7i) — minimal, exactly the shape `ai_engine`'s `/api/rag/check-compliance` already returns: `inspection_id`, `pillar`, `compliance_status`, `analysis`, `citations`, `applicable_regulations`, `created_at`. No new modeling — store the response as-is.

**Endpoints** (`backend/src/routes/tickets.py`, `backend/src/routes/inspections.py`, new):
- `POST /tickets` — manual ticket creation (`source=manual`, `created_by=current_user`). This is what Worker's "Report a Problem" and a future Safety Officer "New Ticket" page both call.
- `GET /tickets` — list, scoped to caller's `mine_id` (Worker/Safety Officer) — RBAC via the existing `require_user_types`/JWT-claims pattern, no client-supplied `mine_id` trusted.
- `PATCH /tickets/{id}` — assign / change status / resolve (photos + notes) / append a comment. One endpoint, several optional fields, since the frontend's existing `resolveTicket` call site is already shaped this way.
- `POST /inspections` — Worker submits an observation. Backend synchronously calls `ai_engine`'s `POST /api/rag/check-compliance` with the observation's `description`, stores the result as a `Violation`, and — if `compliance_status` is `NON_COMPLIANT` or `REVIEW_REQUIRED` — auto-creates a `Ticket` with `source=violation`, `violation_id` set.
- `GET /inspections` — list, scoped to caller's `mine_id`.

**Decision needed**: does Worker's existing "Report a Problem" form (title/category/severity/location/description — no photo/voice capture UI today) call `POST /tickets` (manual) or `POST /inspections`? Recommend **`POST /tickets` directly** — the form's fields map cleanly onto a manual ticket and nothing in the current UI collects photos/voice/lat-lng, so routing it through `Inspection` would mean fabricating fields the form doesn't have. Treat `POST /inspections` (with the RAG-violation pipeline) as a separate future flow once a real observation-capture UI exists (photos, GPS, voice note per `lld.md` §7e) — not this phase.

## Phase 3 — Wire the two dashboards

**`WorkerDashboard`** (`frontend/src/components/views/WorkerDashboard.tsx`):
- "Report a Problem" (`handleReportSubmit`) → `POST /tickets` instead of `dashboardDataStore.addTicket` (mock).
- "My Tasks" → becomes "My Assigned Tickets": `GET /tickets?assigned_to=me` (server-side scoped from JWT, not a client-passed filter) replaces the mock `workerTasks` array entirely. This resolves the gap flagged earlier — `lld.md` has no `WorkerTask` collection, only `Ticket.assigned_to`.
- Sensors panel (`sensors` prop) stays on mock data — telemetry is phase 2 of the overall roadmap, not this plan.

**`SafetyOfficerDashboard`** (`frontend/src/components/views/SafetyOfficerDashboard.tsx`):
- `tickets` → `GET /tickets` scoped to the officer's `mine_id`.
- `resolveTicket` → `PATCH /tickets/{id}`.
- `inspections` → `GET /inspections` scoped to the officer's `mine_id`.
- `sensors`, `auditTrail`, the hazard-simulation buttons (`simulateHazard`/`resetHazard`/`broadcastEvacuation`) all stay on mock data — telemetry and blockchain audit are both later phases, and the simulation buttons are demo tooling with nothing to wire them to yet.

**Not touched this phase**: `CorporateDashboard`, `RegulatoryDashboard`, `AdminDashboard` (beyond the Users page, already real) — they need Mine aggregate stats and production/environment data this plan doesn't build.

---

## Open questions (need your answer before/while coding)

1. **`Ticket.category`** — keep as free text (recommended) or drop / map onto `pillar`?
2. **Worker's "Report a Problem"** — confirm it should call `POST /tickets` directly (recommended above), not `POST /inspections`.
3. **`Asset` model in phase 1** — build it now with no consumer yet (as scoped above), or skip it entirely until the CV/telemetry phase actually needs it? Recommend building it now since it's a two-minute model and avoids a schema migration later, but flagging since "no consumer yet" is a real YAGNI concern.
4. **Ticket `severity` values** — the frontend already uses `low`/`medium`/`high`/`critical` (see `mockData.ts`'s `Ticket` interface) — keep these four, or align to something else?

---

## What this plan does *not* do

- No WebSockets, no live telemetry, no `MineMap`.
- No blockchain/`AuditLedgerEntry` — `SafetyOfficerDashboard`'s audit trail panel stays mock.
- No CV/PPE detection pipeline — `source=cv_detection` on `Ticket` stays unreachable this phase.
- No offline sync / IndexedDB queue for inspections (`SyncStatus` page).
- No Corporate/Regulatory/Admin Mine-CRUD dashboard work.

## Sequence

1. You review this plan, answer the four open questions above (or redirect the approach).
2. Phase 1 — real `Mine`/`Subsidiary`/`Asset` models, seed script update.
3. Phase 2 — `Ticket`/`Inspection`/`Violation` models + endpoints, `ai_engine` RAG call wired in.
4. Phase 3 — `WorkerDashboard` + `SafetyOfficerDashboard` swapped onto real data.
5. Verify: `tsc --noEmit` + `vite build` on frontend, a manual smoke test creating a ticket as Worker and resolving it as Safety Officer, backend container rebuild/health check.
6. You verify in the browser.
