# Feature Audit — 2026-09-06

Ground-truth audit of what is actually coded today, across `backend/`, `frontend/`, and `ai_engine/`. Old docs under `research/` (lld.md, architecture.md, cleanup-plan.md, prev_ps.md, ai_engine_review.md) are **not trusted** as source of truth — every claim below comes from reading the current code. Discrepancies against the old docs are called out per-feature so they can be corrected or the old docs retired.

All 6 sections below are now complete. Section 0 is the standing list of problems/decisions the user raised, each resolved against what the audit actually found.

---

## 0. Open Problems & Decisions Needed — RESOLVED

1. **Attendance — is there a backend, and is it reachable?**
   User's starting belief: only frontend + ai_engine, no backend, no dedicated route. **Verdict: half right.** Backend is real and load-bearing — every attendance mark goes Frontend → Backend (auth + mine resolution) → proxied to ai_engine → **Backend persists the result to MongoDB**. Frontend never talks to ai_engine directly. But the "no dedicated route" half is correct: it's purely a modal opened from buttons on `/worker` and `/dashboard/worker`, no `/attendance` route exists. Full detail: **Section 5**.

2. **Person Issues / Site Issues don't use all their own API endpoints.**
   Confirmed and enumerated exactly: `POST /person-issues` (manual), `POST /person-issues/detect` (CV), and `POST /site-issues/detect` (anomaly) are all fully implemented, correctly wired to ai_engine, and have **zero frontend caller**. The only real end-to-end Issue-creation path in the entire app is the worker's manual site-issue report form. No status/resolve endpoint exists for either model at all — not unused, never built. Full detail: **Section 3**.

3. **Why do WebSocket endpoints exist when nothing's built for WebSockets or sensor ingestion yet?**
   Confirmed via repo-wide grep: **zero WebSocket code exists anywhere in the codebase.** Nothing to remove — this was chat/doc talk, never coded. Closed, not tracked further.

4. **Issues (Person/Site) don't use `ai_engine` anywhere.**
   Partially true — confirmed and refined. Issues **do** call ai_engine, but only for CV-PPE-detection and anomaly-detection (via the two dead `/detect` routes in item 2) — RAG/compliance-checking is never called from Issues or from anywhere else in the backend; RAG is completely isolated inside ai_engine, called by nothing. Full detail: **Section 3** and **Section 6**.

5. **How are images being stored?**
   Answer: there is **no single answer** — three different, ad-hoc behaviors. Site Issues: the "Add Photo" button is a confirmed fake — it never reads a file, and the schema has no photo field to put one in anyway. Person Issues: field exists on the model, nothing populates it (the CV-detection path explicitly discards the image after use). Inspections: real persistence, but as unbounded base64 text stored inline inside the MongoDB document itself — no S3/GridFS/disk. Attendance (audited separately) is the only feature with real disk-based image storage. Full detail: **Section 3** (Issues/Inspections) and **Section 5** (Attendance).

6. **Location has "been built" and is being asked for somewhere — unclear what for or where.**
   Confirmed: no standalone location-tracking feature exists. There are exactly two unrelated one-shot lat/lng captures in the whole app: one inside the Inspection observation form (via `useGeolocation`), and a separate one inside Attendance check-in. Neither is part of a shared "location" system. Full detail: **Section 2**.

7. **How is location actually saved (persistence)?**
   Both capture points are single point-in-time values, not history. Inspection's lat/lng lands in `Inspection.observations[].lat/lng` (overwritten with each new observation, no track kept). Attendance's lands in `AttendanceRecord.latitude/longitude` per check-in record. No time-series/live-tracking model exists anywhere — confirmed `LocationPing` (documented in old `lld.md` as a *design*, explicitly tagged "Not built") is genuinely absent from all code. Full detail: **Section 2**.

8. **How is the mine map designed?**
   Answer: it's **not** a real geographic map — no Leaflet/Mapbox/image. `MineLevelMap.tsx` procedurally generates a Voronoi diagram client-side (seeded pseudo-random points → convex hull → Voronoi cells → inline SVG) purely for visual effect; there is zero real section geometry/coordinates stored in the backend. What *is* real: the level list and which cells are colored red (open issues) come from live API calls. Notably, `leaflet`/`react-leaflet` are installed in `package.json` but used nowhere. Full detail: **Section 2**.

9. **The separate `/worker` flow has to go. — RESOLVED (2026-09-06).**
   Confirmed `/worker` is a distinct route from `/dashboard/worker/*`, gated to the `worker` role, hosting the Inspection form + an Attendance modal. **The earlier open nuance is now settled**: `Dashboard.tsx`'s own code comment confirms `DASHBOARD_PATH_BY_ROLE` (which maps `worker → /worker`) is used in exactly one place in the entire frontend — `LandingPage.tsx:95`, the guest-login flow only. A normal password login always lands on shared `/dashboard`, which explicitly redirects a `worker` role to `/dashboard/worker`, never `/worker` — confirmed directly in `Dashboard.tsx`'s source comment ("deliberately" not using that map, since it's "the guest-login landing convention"). **Conclusion: once guest login is removed, `/worker` becomes fully unreachable through any real navigation path** — nothing orphans a real worker. Ties into **Section 1** (guest login) and **Section 3** (Inspections).

10. **The Inspection model should be removed.**
    Confirmed low-risk: zero downstream consumers, no read/list endpoint ever existed (write-only from day one). The one thing worth preserving from it: `ObservationForm`'s capture mechanism (real IndexedDB offline queue, real photo/voice/geo capture) is solid engineering — the removal should redirect that capture flow into Person/Site Issue creation rather than deleting the mechanism along with the model. Full detail: **Section 3**.

11. **Location needs to be captured section-and-level-wise.**
    Confirmed as a real gap, not yet a bug: both existing location captures (Inspection, Attendance) are raw lat/lng only, with no resolution to a mine level/section. `PersonIssue`/`SiteIssue` already do carry real `level`+`section` fields today (worth reusing that pattern rather than inventing a new one). Full detail: **Section 2**.

12. **Guest login should be removed and replaced with a better login approach.**
    Confirmed real and fully wired end-to-end (`POST /auth/guest` → pre-seeded per-role demo users), triggered from two places on the landing page. This is a genuine deprecation of working functionality, not dead-code deletion — plan the replacement login flow before pulling it out. One open thread found during the audit, not a blocker: it's unclear where `ensure_guest_users_seeded()` (the function that would create these guest accounts) is ever actually invoked from — moot once guest login is removed either way. Full detail: **Section 1**.

**Two additional gaps surfaced during the audit that weren't on the original list, flagged here since they're concrete and verified (not speculative):**

13. **A role-change leaves stale data behind. — HALF-RESOLVED, one new equivalent gap found and fixed (2026-09-06).** `PATCH /users/{id}/role` updates `User.role` but never touches the `role` field already snapshotted onto that user's existing `MineAssignment` row(s). Since Regulator's visibility is specifically derived by filtering `MineAssignment.role == "corporate_manager"`, a user promoted/demoted away from that role can show up in (or vanish from) regulator visibility based on stale data, independent of their real current role. Not previously documented anywhere. → **Section 1**.
    - **The original mechanism is eliminated by Phase 1**: once `MineAssignment` is deleted, there's no second `role` copy anywhere left to go stale.
    - **But a structurally identical new risk was found in the redesign itself**: `PATCH /users/{id}/role` still exists (the one "change" capability being kept, per item 5), and today it only does `target.role = new_role; save()` — it never touches `target.profile`. Once `profile` is role-typed (`WorkerProfile` vs `CorporateProfile`, etc.), a role-change without a matching profile-reshape produces the exact same category of bug, just relocated: a user ending up with e.g. `role="corporate_manager"` but `profile` still holding a stale `WorkerProfile`. **Fix, confirmed**: `change_role` now also resets `profile` to a fresh, empty instance of the new role's class — mirroring the "new users start mine-less" rule (item 9) exactly, rather than trying to carry any of the old shape over. Detail in the plan file's Phase 1.

14. **The RAG assistant would 503 even if it were wired up right now** — independent of nobody calling it, `ai_engine/.env` has `GROQ_API_KEY=` set to an empty value, so a direct call to the endpoint fails today. Worth fixing alongside any decision to actually wire RAG in. → **Section 6**.

---

## 1. Auth / Guest Login / User & Access Management — Changes Planned DONE (2026-09-06)

### 1a. Auth (password + Google login)
**Backend** — `models/user.py` (`User`: email/phone/password_hash/google_id/role/legacy mine_id&subsidiary_id [dead]/full_name/role_title/is_guest/active). `routes/auth.py`: `POST /auth/login`, `POST /auth/google`, `POST /auth/logout` (stateless JWT — does **not** revoke server-side, self-documented), `GET /auth/me` (returns `mine_ids` computed live via `accessible_mine_ids`, not stored). `services/auth_service.py`: password login checks bcrypt + `active`; Google login requires a **pre-existing** user by email (no self-provisioning — "an Admin must invite first"). JWT claims are only `{sub, role}` — no scope claims; scope resolved per-request from `mine_assignments`.

**Frontend** — `/login` (public route), reachable via "Operator Login" on the landing page. `authStore.ts` wired to the real endpoints. `Login.tsx` shows a hardcoded `DEMO_ACCOUNTS` list that is verified to mirror `backend/scripts/seed_users.py` exactly. Google login is fully coded end-to-end but **gated off** behind `GOOGLE_AUTH_ENABLED = false` — not reachable in the UI today.

**Roles** (exact enum): `worker | safety_officer | corporate_manager | regulator | admin`. Enforced per-route via `require_role(...)`, no global RBAC middleware.

**Gaps**: logout doesn't invalidate tokens (documented limitation, not a bug). No endpoint anywhere sets `User.active = False` — deactivation requires a direct DB edit.

**Doc check**: matches `lld.md` closely; `architecture.md` self-flags as partially superseded, consistent with being stale.

### 1b. Guest Login
**Backend** — `auth/guest.py`: one seeded demo `User` per role (`is_guest=True`), `get_guest_user(role)` does a straight lookup. `POST /auth/guest` → `login_as_guest(role)` → 400 if that role's guest was never seeded. **Open question, not confirmed either way**: could not find where `ensure_guest_users_seeded()` is actually invoked from — guest accounts may depend on a manual seed script having been run.

**Frontend** — Landing page only (`/`): hero "Explore as Guest" button (hardcoded to `safety_officer`) + one "Continue as Guest" card per role. Real call to `POST /auth/guest`, not mocked. Failure shows a toast, doesn't crash.

**Status**: fully real and wired — this is a genuine, working login mechanism (not a mock), which is what makes removing it a real deprecation, not just deleting dead code. **User's decision: remove and replace with a better login approach** (see Section 0 item 12) — no replacement has been designed yet.

### 1c. User & Role Management (Admin)
**Backend** — `routes/users.py`: `POST /users` (usable by admin/regulator/corporate_manager/safety_officer — **not admin-only**; actual allow/deny happens inside `provision_service` via a `DELEGATION_HIERARCHY`: admin→any role, regulator→corporate_manager only, corporate_manager→safety_officer only, safety_officer→worker only); `GET /users` (admin-only, no pagination — returns everything); `PATCH /users/{id}/role` (admin-only; blocks self-role-change and blocks demoting the last remaining admin).

**Frontend** — `/dashboard/admin/users` and `/dashboard/admin/access`, real sidebar links, real API calls (`GET /users`, `POST /users`, `PATCH .../role`, `POST/DELETE /mine-assignments`) — no mock data found anywhere in these pages.

**Gaps**: no account-deactivation endpoint exists at all (matches `lld.md`'s own "not built" note — doc and code agree here). `GET /users` has no filtering/pagination.

### 1d. Mine Assignments (worker↔mine mapping / access scoping)
**Backend** — `models/mine_assignment.py` (`user_id, mine_id, role [snapshotted from user at assignment time], active, assigned_at, revoked_at`). `routes/mine_assignments.py` — all 3 endpoints (`GET/POST /mine-assignments`, `DELETE /mine-assignments/{id}`) are **admin-only**. Delete is a soft-delete (`active=False` + `revoked_at`). `auth/dependencies.py::accessible_mine_ids`: for every role except regulator, it's the user's own active assignments; for **regulator**, scope is derived as "every mine with any active corporate_manager assignment, sitewide" — the code's own comment admits this "breaks the moment a second regulator exists."

**Frontend** — no dedicated nav item; lives inside `/dashboard/admin/access`. Real `GET/POST/DELETE` calls, re-fetches after each mutation rather than faking success.

**Verified bug (not previously documented anywhere)**: `provision_service.change_role` updates `User.role` but never updates the `role` field already snapshotted onto that user's existing `MineAssignment` row(s). Since regulator scope is derived by filtering `MineAssignment.role == "corporate_manager"` specifically, a user promoted/demoted away from `corporate_manager` via role-change will still be included/excluded from regulator visibility based on the now-**stale** snapshot, not their real current role, until a human manually re-touches that assignment. Also: `POST /mine-assignments` never validates that `mine_id` refers to a real `Mine` (no 404 check, unlike the `user_id` check which does exist).

### Changes Planned (discussed 2026-09-06 — implemented, see `implementation-plan-6-sep.md` Section 1)

1. **Remove `subsidiary_id` everywhere.** Delete the `Subsidiary` model/collection entirely, and remove `subsidiary_id` from both `User` and `Mine` (currently dead/legacy fields on both, confirmed unused by any query or authorization logic).

2. **Remove guest login entirely**, replaced by the normal email/phone + password login only — no shortcut/demo-login path of any kind going forward. Scope of removal: the `is_guest` field on `User` (what was referred to as "guest_id" in discussion), `backend/src/auth/guest.py` (`GUEST_SEED_USERS`, `ensure_guest_users_seeded`, `get_guest_user`), the `POST /auth/guest` route + `auth_service.login_as_guest`, the guest-seeding script, every existing guest user document in the DB, and the frontend's "Explore as Guest"/"Continue as Guest" UI on the landing page (`handleGuestLogin`, `loginAsGuest` in `authStore.ts`). `research/lld.md`'s guest-login documentation gets updated later, once this and other structural changes are actually implemented — not now.
   - **Follow-up RESOLVED (2026-09-06)**: confirmed via `Dashboard.tsx`'s own code comment that a normal password-logged-in Worker never reaches `/worker` — only the guest-login flow's `DASHBOARD_PATH_BY_ROLE` map sends anyone there. See Section 0 item 9. `/worker` becomes fully unreachable via any real navigation once guest login is removed — nothing to reconcile before removing it.

3. **Naming convention going forward**: refer to this feature as **"User & Role Management"**, not "...( Admin)" — creation (`POST /users`) is available to 4 of the 5 roles under the delegation hierarchy; only listing (`GET /users`) and role-changing (`PATCH /users/{id}/role`) are actually admin-exclusive.

4. **Remove `MineAssignment` entirely.** Mine scope moves onto `User`, but **inside the per-role profile classes** (item 6 below) — `WorkerProfile.mine` / `OfficerProfile.mine` (single, nullable) and `CorporateProfile.mines` / `RegulatorProfile.mines` (array) — not as flat top-level fields directly on `User`, since that would carry a meaningless `mine: null` on every corporate/regulator user and a meaningless `mines: []` on every worker/officer, which is exactly the cross-role-null problem the profile classes exist to prevent. No replacement audit trail (assigned_at/revoked_at/active history) is being kept — granting/revoking mine access becomes a plain edit to the user's own profile field, by design choice.
   - **API response shape**: `UserResponse`/`GET /auth/me` return the mine scope exactly as stored (`mine`/`mines`), not the synthetic flattened `mine_ids: list[str]` used today for every role. Full frontend impact (every real consumer, verified by grep, plus what's confirmed *not* affected) is in the plan file's Phase 1.
   - **Why**: this directly eliminates a real bug found in this audit (see the verified bug immediately above this section) — role and mine-scope living in two different places (`User.role` vs. `MineAssignment.role` snapshot) is what let them go stale relative to each other; collapsing them onto one document removes the possibility entirely. It also retires the Regulator "derived sitewide scope" hack (`accessible_mine_ids` deriving regulator visibility from every active corporate_manager assignment, sitewide) documented as a known fragile simplification in `research/saumy/09-changes-5-sep.md` Decision #13 — Regulators get their own explicit `mines` array like Corporate Managers, instead.
   - `/dashboard/admin/access` (today's separate role-change + mine-assignment page, which exists specifically because assignments didn't fit under Users or Mines alone) folds into `/dashboard/admin/users`. Full impact list is tracked in `research/implementation-plan-6-sep.md`'s Phase 1, not duplicated here.

5. **Full add/delete/change management across the 5-role hierarchy — discussed, explicitly NOT being built today.** Delete/deactivation of a user is out of scope for now (confirmed: too much work for this project right now, not just deprioritized silently). Role-upgrade (e.g. promoting a worker straight to officer) is also explicitly out of scope for now — the example that prompted this discussion was illustrative only, not a real requirement to build. "Change" for today stays limited to role only, via the existing `PATCH /users/{id}/role` — no general field-edit endpoint is being added right now. **When this does eventually get built**, edit/delete authorization is confirmed to follow **hierarchy + mine-scoping together**, not hierarchy alone — e.g. an officer would only ever be able to manage workers within their own single mine, never a worker belonging to a different mine, mirroring how creation is already scoped today.

6. **Five role-profile model classes, one per role, in separate files** — `backend/src/models/worker_profile.py`, `officer_profile.py`, `corporate_profile.py`, `regulator_profile.py`, `admin_profile.py` (underscore naming; a literal `worker.profile.py` wouldn't import correctly as a Python module, since a dot inside a filename isn't a valid module path). Purpose: each role's extra fields live in its own small class instead of piling up as nullable fields directly on `User` — the fix for "I can't tell a worker's structure apart from a regulator's, and don't want null-padded fields on every other role's document." `WorkerProfile`/`OfficerProfile` carry `mine` (item 4); `CorporateProfile`/`RegulatorProfile` carry `mines`; `admin_profile.py` stays genuinely empty since admin has no mine-scope concept at all. No other fields are being added to any of the 5 classes right now — they stay otherwise empty until a specific field is asked for.
   - `User.profile` is wired as part of Phase 1, resolved as **manual role-based resolution**: `User.role` picks which class applies when reading/writing `profile`, rather than relying on Pydantic's automatic discriminated-union detection — needed because `WorkerProfile`/`OfficerProfile` are shape-identical to each other (indistinguishable by shape alone), so no discriminator tag field is needed either.
   - Side-benefit: because `mine`/`mines` only exist on the classes where they apply, the earlier concern about needing runtime validation ("only the applicable field is set for this role") is solved by construction — a `WorkerProfile` instance simply has no `mines` field to accidentally set.

7. **Remove `role_title` everywhere.** Verified by grep: real field on `User`, accepted at creation (`CreateUserRequest.role_title`) and returned in `UserResponse.role_title`, passed through `user_service.create_user`/`provision_service.provision_user`, present in both `seed_users.py` and `auth/guest.py`'s seed data — **but zero references exist anywhere in `frontend/src`**. Nothing displays or reads it; it's pure dead weight carried since creation. Full removal scope: `models/user.py`, both schema locations in `schemas/users.py`, both service pass-throughs, both route usages in `routes/users.py`, and the seed value in `seed_users.py` (the `auth/guest.py` occurrence is moot — that whole file is deleted in Phase 3 anyway).

8. **`change_role` resets `profile` on every role change (confirmed 2026-09-06).** Fixes the newly-found equivalent of the Section 0 item 13 bug: `provision_service.change_role` will, alongside setting `target.role = new_role`, also replace `target.profile` with a fresh empty instance of the new role's profile class (e.g. going `officer → corporate_manager` discards the old `OfficerProfile` and sets a brand-new empty `CorporateProfile`, not a carried-over/reshaped one). No data is migrated across the role change — same mine-less-start philosophy as new-user creation (item 9 below), applied consistently to role-changes too.

9. **Create-user form starts mine-less; mine assignment is a separate edit step (confirmed 2026-09-06).** A newly created user's `profile.mine`/`profile.mines` starts empty — the create form does not need a role-conditional mine-picker at creation time. Assigning a mine happens afterward, as a separate edit action on the same row — which, after the `/access` fold-in (item 4 above), just means editing that user directly on `/dashboard/admin/users`, not a separate page or a separate step in the creation flow itself.

10. **Execution order for everything in this section is now tracked separately** in `research/implementation-plan-6-sep.md` — 4 phases: **Phase 1** (create profile classes with `mine`/`mines` inside them, wire `User.profile`, retire `MineAssignment` entirely, fold `/access` into `/users`, fix the `UserResponse`/`GET /auth/me` shape) → **Phase 2** (remove `subsidiary_id`) → **Phase 3** (remove guest login) → **Phase 4** (rewrite seed data and reseed from clean). This file stays the decisions-and-reasoning record; that file is the concrete step-by-step order.

---

## 2. Mine / Levels / Map / Geolocation — Changes Planned items 1–4, 6, 7 DONE (2026-09-07); item 5 blocked

### 2a. Mine Management
**Backend** — `Mine` model is deliberately minimal: `name, lat?, lng?` (+ dead legacy `subsidiary_id`). `GET/POST /mines` — admin sees all, corporate_manager/regulator see only their scoped mines; a corporate_manager creating a mine auto-grants themselves a `MineAssignment` to it. No update/delete endpoints. No boundary/geometry fields exist. Matches `lld.md` exactly (doc header claims 2026-09-06 reconciliation, and it held up on inspection).

### 2b. Mine Levels & Sections
**Backend** — `MineLevel` model is `mine_id, level (str), section_count (int)` — **"section" is only a count, there is no per-section record** (no id/name/geometry per section). Only one endpoint exists: `GET /mine-levels` (worker/safety_officer only) — **there is no create/update endpoint at all**; `MineLevel` rows only ever get created by directly running `backend/scripts/seed_users.py`, with zero admin UI/API path to define levels or sections.

Separately, `PersonIssue`/`SiteIssue` **do** carry real `level: str` + `section: int` fields directly on each issue — so issue data is already level+section-aware today, it's just that the `MineLevel` registry (which only tracks a section *count* per level) and issue records are completely uncoupled — nothing validates an issue's `section` number against its level's `section_count`.

### 2c. Mine Map / Level Map visualization
**This is the direct answer to "how are the maps designed":** the map is **not** a real geographic map, not an image, not Leaflet/Mapbox. It's a **client-side procedurally generated Voronoi diagram** (`frontend/src/components/MineLevelMap.tsx`) — for a selected level, `section_count` points are scattered via a seeded pseudo-random function, convex-hulled, and Voronoi-partitioned into irregular cell shapes, rendered as inline SVG. The shapes are **pure decoration with zero real backend geometry behind them** — the code's own comment admits "a real 'saved layout' would eventually persist these seeds/positions server-side," which hasn't happened.

What *is* real and live-fetched: the level list + `section_count` (from `GET /mine-levels`), and cell coloring — cells go red if there's an **open** PersonIssue/SiteIssue at that level+section (`GET /person-issues` / `GET /site-issues`, matched by `${level}-${section}` key). So: which cells are red is real data; the cell shapes/positions themselves are fake geometry.

**Notable dead dependency**: `leaflet`/`react-leaflet`/`@types/leaflet` are installed in `frontend/package.json` but imported nowhere in the codebase (confirmed by grep) — installed, never used.

### 2d. Geolocation capture
**Hook**: `useGeolocation.ts` — continuously watches GPS (`watchPosition`), but it has exactly **one consumer in the entire codebase**: `ObservationForm.tsx` (the Inspection form). Despite the hook watching continuously, only a **single snapshot** is captured — whatever the current value is at the moment the form is submitted.

**This directly answers Section 0 items 6–7 ("what is location for, how is it saved")**: geolocation today exists *only* to stamp one lat/lng pair onto an Inspection observation. Storage path: `ObservationForm` → IndexedDB queue (`db.ts`) → synced via `useSyncManager.ts` → `POST /inspections/observations` → persisted as `Inspection.observations[].lat/lng` (a nullable float pair on an embedded sub-document, one observation per Inspection in practice). There is no history — it's one point in time, gone once overwritten by the next observation.

A **second, entirely separate** lat/lng capture exists for Attendance (`AttendanceRecord.latitude/longitude` — required, non-nullable, plus a computed `distance_from_site_m`) — unrelated model, unrelated code path, not shared with `useGeolocation`/Inspection at all.

**Confirmed absent (matches Section 0 item 6's suspicion exactly)**: repo-wide grep for `LocationPing`/`location_ping`/`live tracking` returns **zero matches in actual code**. `lld.md` itself documents a `LocationPing` design (`mine_id, worker_id, lat, lng, recorded_at`, periodic pings powering a live "where is everyone" map layer) but explicitly tags it **"Not built"** — the doc and reality agree here. There is no live tracking anywhere in this codebase today, and neither location-capture path (Inspection or Attendance) is level/section-aware — both are raw lat/lng only. **This is the gap behind Section 0 item 11** (location needs to be section/level-wise) — today it's coordinate-only in both places it's captured.

### Summary of verified gaps (Section 2)
1. No API/UI path to create `MineLevel` rows — seed-script only.
2. `MineLevel.section_count` and issue `section` values are uncoupled — no range validation.
3. Map section shapes are 100% synthetic client geometry, no real coordinates stored anywhere.
4. `leaflet`/`react-leaflet` installed but fully dead.
5. Both geolocation capture points (Inspection, Attendance) are single-snapshot, coordinate-only, not level/section-aware, no history retained.
6. `LocationPing`/live tracking: confirmed fully unbuilt.
7. `Subsidiary`/`subsidiary_id` dead legacy fields still present on `Mine`/`User`.

### Changes Planned (discussed 2026-09-06/07 — items 1–4, 6, 7 implemented; item 5 blocked, see `implementation-plan-6-sep.md` Section 2)

1. **Persist the mine-level diagram server-side instead of generating it client-side every render.** The same Voronoi computation (`MineLevelMap.tsx` today) runs once and its *result* — each section's actual polygon coordinates — gets stored (on `MineLevel` or a related structure) and returned by `GET /mine-levels`. The frontend stops computing shapes at all; it just renders whatever polygons it's given. This makes the diagram real, stable, per-mine data instead of a reproducible-but-fake client computation, and is a genuine architecture improvement, not just a variant of what's there today.

2. **Widen mine/level visibility beyond worker/safety_officer.** `GET /mine-levels` gains a `mine_id` parameter (it currently has none, since it only ever resolves the caller's one implicit mine): worker/officer keep using their single mine as today; `corporate_manager`/`regulator` must supply a `mine_id` that's present in their own `profile.mines`; `admin` may supply any `mine_id`, unrestricted (matching how `/mines` already treats admin). `require_role` widens accordingly. Frontend `MineMapPage` gains a mine-picker for the three roles that don't have one implicit mine.
   - **Confirmed fix required alongside this (2026-09-07)**: `MineLevelMap.tsx` currently colors a section red by matching an issue's `${level}-${section}` key, with no `mine_id` involved at all — harmless today since only single-mine roles use it, but wrong the moment a multi-mine role can pick between mines (two different mines can both have a "Level A, Section 3"). `PersonIssue`/`SiteIssue` already carry a real `mine_id` field, so this is a frontend-only fix: match on `${mine_id}-${level}-${section}` and filter fetched issues down to the selected mine first. No backend change needed.

3. **New public, unauthenticated endpoint** returning only `{id, name, lat, lng}` per mine — deliberately minimal, no issue data, no scope data, nothing sensitive — so the landing page can show mine locations before login.

4. **Landing page gets a real Leaflet map of India**, plotting every mine from the new public endpoint. This is the first real use of `leaflet`/`react-leaflet` (installed since before this audit, confirmed dead until now).
   - **Confirmed (2026-09-07)**: built as its own standalone component, `frontend/src/components/IndiaMineMap.tsx`, not inline in `LandingPage.tsx` — so it can be reused or moved to a dedicated page later without duplicating code.

5. **In-mine worker/officer location is modeled as a checkpoint — `current_level` + `current_section` — never GPS.** GPS does not function underground; this is a physical constraint, not a design shortcut. Reuses the same `level`/`section` fields `PersonIssue`/`SiteIssue` already carry. Full reasoning (offline-sync mechanics via the existing Inspections IndexedDB pattern, why Attendance doesn't need this, the verified current geolocation mechanism, PWA status) is written up separately in `research/location-and-pwa-notes-7-sep.md` — not duplicated here.
   - **Open, deliberately deferred — not decided**: who performs the check-in (the worker themselves, or their Safety Officer setting it for them). Nothing in this item can be phased into concrete steps until this is answered.
   - Once built, `WorkerReportPage`'s level/section fields should pre-fill from this checkpoint (still editable), instead of requiring manual entry every time.
   - A demo-only animated "worker moving between sections" visualization is explicitly separate from this real feature — cosmetic, not to be conflated with the actual checkpoint mechanism when either gets built.

6. **Attendance requires no change.** Confirmed: its existing GPS+Haversine geofence check happens at the surface (clock-in), a different, correctly-scoped concern from in-mine section tracking. Not a gap — a verified non-issue.

7. **`MineLevel` creation stays seed-script-only for now — confirmed deliberate, not an oversight (2026-09-07).** The goal right now is only to demonstrate that a real map exists and works, not to build a general "create new mine maps" admin capability. Revisit later if/when adding new mines becomes a real product need.

---

## 3. Person Issues / Site Issues / Inspections — Changes Planned items 1–4 DONE (2026-09-07)

### 3a. Person Issues — endpoint-by-endpoint usage (resolves Section 0 item 2)
`Model`: worker_id, mine_id, level, section, issue_type, source (camera/manual), observation, `photo_url: Optional[str]`, severity, status (open/resolved — **no endpoint ever sets it to resolved**), created_at.

| Endpoint | Used from frontend? |
|---|---|
| `POST /person-issues` (manual, safety_officer) | ❌ Dead — no caller anywhere |
| `GET /person-issues` | ✅ Used (map + safety issue list) |
| `GET /person-issues/me` | ✅ Used (worker's own open-issue banner) |
| `POST /person-issues/detect` (camera→AI PPE check) | ❌ Dead — wired to ai_engine, never called |

### 3b. Site Issues — endpoint-by-endpoint usage
`Model`: mine_id, level, section, issue_type, source (sensor/manual), observation, sensor_reading_snapshot, severity (NORMAL/WARNING/CRITICAL), recommended_action, status, created_at. **No photo field exists on this model at all.**

| Endpoint | Used from frontend? |
|---|---|
| `POST /site-issues` (worker's report form) | ✅ Used — the one real end-to-end Issue-creation path in the app |
| `GET /site-issues` | ✅ Used (map + safety issue list + worker's own report history) |
| `POST /site-issues/detect` (sensor→AI anomaly check) | ❌ Dead — wired to ai_engine, never called |

**Bottom line on Section 0 item 2**: the *only* live Issue-creation path today is the worker's manual site-issue report. Both `/detect` endpoints (camera PPE, sensor anomaly) are fully implemented and correctly call ai_engine — they just have zero caller. No status/resolve endpoint exists for either model at all (not unused — never built), so once created, an issue can never be marked resolved through the API today.

### 3c. Confirms Section 0 item 4 — Issues do not use ai_engine's RAG anywhere
Grepped all of `backend/src` for any reference to `rag_engine`/`check-compliance`/`check_compliance`: **zero hits outside ai_engine itself.** Person/Site Issues *do* call ai_engine, but only for CV-PPE-detection and anomaly-detection (via the two dead `/detect` routes above) — never for RAG/compliance citation. RAG is fully isolated inside ai_engine, called by nothing in the entire backend.

### 3d. Resolves Section 0 item 5 — how images are actually stored, per feature
This differs completely across the three features — there is no single answer:

- **Site Issues: no persistence at all, and the "Add Photo" button is fake.** Confirmed bug: `WorkerReportPage`'s `handlePhotoUpload` does not open a file picker or read any file — it only sets a boolean (`hasPhoto = true`) and shows a fake "Photo Attached ✓" success toast. The actual `POST /site-issues` payload has no photo field to put one in even if the button were fixed (`SiteIssue` model has none). Net: zero bytes are ever captured, sent, or stored for a Site Issue photo — it's a pure false affordance from click to database.
- **Person Issues: also no persistence, but for a different reason.** `photo_url` exists on the model as a bare optional string, but nothing in the frontend calls the manual-creation endpoint that could populate it. The camera-detection path (`/person-issues/detect`, itself unused) explicitly hardcodes `photo_url=None` — the uploaded image bytes are read, sent to ai_engine for detection, and then **discarded**, never written anywhere.
- **Inspections: real persistence, but as inline base64 text.** A photo picked in `ObservationForm` is converted client-side to a base64 data URI, queued in IndexedDB, POSTed as a plain string, and stored **verbatim inside the MongoDB `inspections` document itself** (`Observation.photo_urls: List[str]`) — no S3/GridFS/disk, no separate blob store. This is real (if inefficient/unbounded) persistence — the model's own code comment already flags this as a temporary approach pending a real media-upload/blob-storage service.

There is currently **no shared image-storage service anywhere in the codebase** — each feature (where it stores anything at all) does it a different, ad-hoc way. (Attendance, audited separately in Section 5, is the one feature with real disk-based image persistence.)

### 3e. Inspections — full detail (feeds the removal decision, Section 0 item 10)
Only one endpoint exists on the entire router: `POST /inspections/observations` (used, called from `useSyncManager.ts`). There is **no read endpoint at all** — no way to list or view a past inspection via the API, and even the create-response itself doesn't echo back the submitted observation data. Reachable via route `/worker` (not `/dashboard/worker/*`), which is where workers land immediately after login per `DASHBOARD_PATH_BY_ROLE`.

Confirmed real (not fake) client-side capture in `ObservationForm.tsx`: photo via `FileReader.readAsDataURL`, voice note via real `MediaRecorder`, offline-safe via a genuine IndexedDB queue (`db.ts`) that syncs automatically when connectivity returns (`useSyncManager.ts`). This capture mechanism — the offline queue plus photo/voice/geo capture — is the one part of Inspections that's technically solid and worth preserving if/when its output gets redirected into Person/Site Issue creation instead of the dead-end `inspections` collection.

Does not call ai_engine at all (no CV, no predictive, no RAG) — confirmed via import trace of `inspection_service.py`.

### Summary — dead backend endpoints across this whole cluster
`POST /person-issues`, `POST /person-issues/detect`, `POST /site-issues/detect` — all fully implemented, all zero-caller from the frontend. No status/resolve endpoint exists for Person or Site Issues at all (never built, not merely unused).

### Changes Planned (discussed 2026-09-07) — all items implemented, see `implementation-plan-6-sep.md` Section 3

1. **Real seed data added for Site/Person Issues — `backend/scripts/seed_issues.py`.** While checking the DB's actual contents (prompted by Section 2's map testing), found `site_issues`(4)/`person_issues`(1)/`regulatory_reports`(3) already populated with leftover manual/undocumented data — not produced by any seed script. Two concrete bugs found in that leftover data: an exact duplicate `SiteIssue` (same mine/level/section/type/severity, twice), and a `SiteIssue` referencing Level B/Section 74 — Level B only has 15 sections, a live example of the already-documented "`MineLevel.section_count` and issue `section` are uncoupled" gap (Section 2).
   - **Confirmed**: keep the same counts (4 site issues, 1 person issue) but replace the leftover data with a real, idempotent seed script, following the established one-file-per-collection convention (`scripts/index.py`'s own docstring). Neither bug above was reproduced — the new seed data has no duplicate and stays within each level's real `section_count`, and is spread across both demo mines (3 on ECL, 1 on BCCL) rather than all on one mine, so multi-mine viewing (Section 2, Phase 2) has real data to show on both.
   - The seeded `PersonIssue` is linked to the real seeded worker's `worker_id` (not left null), so the worker's own personal-issue banner (`GET /person-issues/me`) has something real to show in a fresh demo.
   - **Confirmed not in scope**: `RegulatoryReport` seeding. The leftover 3 regulatory-report documents were dropped and **not replaced** — that model's structure is expected to be rebuilt from scratch when Section 4 gets a real planning pass, so seeding it now would just be thrown away later. See Section 4 below.
   - Verified live: worker's `GET /person-issues/me` returns their seeded issue; worker's `GET /site-issues` correctly returns only their own mine's 3 (not BCCL's 1); the Section 2 mine-matching fix was independently verified against a synthetic same-level-and-section-but-different-mine collision case (one mine open, the other resolved) and correctly did not cross-contaminate.

2. **Unified, AI-routed issue reporting — replaces manual issue creation entirely (confirmed 2026-09-07, implemented).** Full reasoning and the exploratory follow-on idea in `research/issue-reporting-ai-pipeline-notes-7-sep.md`.
   - **`PersonIssue` model**: add `source_id: Optional[str]` (reporter's own user id for a manual report; null for camera detections). `PersonIssueType` narrows to `Literal["no_helmet", "no_vest", "other"]` — `unsafe_practice` is dropped, not deferred; `other` is the fallback when the classifier is confident it's a person issue but not one of the two known classes.
   - **`SiteIssue` model**: add `source_id: Optional[str]` (same meaning; null for sensor-triggered issues) **and `photo_url: Optional[str]`** (confirmed 2026-09-07 — the model has no photo field at all today; without this, a photo attached to a report the AI classifies as a site issue would be silently discarded after classification). `SiteIssueType`'s existing 6 values are unchanged.
   - **`POST /site-issues` and `POST /person-issues` (the manual-creation routes) are removed**, replaced by one new `POST /issues` endpoint, callable by `worker` and `safety_officer` with no restriction between them (confirmed 2026-09-07) — the AI decides person-vs-site and the specific type, not the caller's role, so either role's submission is free to land in either collection. The human only supplies a description + optional photo (level/section still resolved from `require_mine_assignment(user)`, same as today). `/site-issues/detect` and `/person-issues/detect` (sensor/camera-triggered, automatic) are untouched.
   - **Response shape (confirmed 2026-09-07)**: `POST /issues` returns a wrapper, `{"target": "site_issue" | "person_issue", "issue": SiteIssueResponse | PersonIssueResponse}` — the caller can't know in advance which collection a report landed in, so the response makes it explicit rather than requiring shape-inference on the frontend.
   - **New `raw_issue_reports` collection** as the durability layer: written (report fields + photo saved to `uploads/pending/`) *before* the AI call, so nothing is lost if the AI engine is unreachable. On successful classification the real `SiteIssue`/`PersonIssue` is created, the photo is moved into `uploads/site_issues/` or `uploads/person_issues/`, and the raw record is **deleted** (no audit trail kept — confirmed). On AI failure it's left as `status: "failed"` for later retry.
   - **PersonIssue classification reuses the existing `cv_engine` PPE detector as-is** (no new AI model) — it already covers exactly `no_helmet`/`no_vest`.
   - **SiteIssue classification needs a new ai_engine capability**: none of its 6 types are identifiable from text or a photo today (the only existing detector, `predictive_engine.assess_anomaly`, requires numeric sensor telemetry, not text). A new LLM text classifier (reusing `rag_engine.py`'s existing Groq plumbing) is needed, and doubles as the person-vs-site routing decision for `POST /issues`.
   - **Photo storage**: root-level `uploads/` folder, subfolders per feature/status (`uploads/pending/`, `uploads/site_issues/`, `uploads/person_issues/`) — no library needed beyond FastAPI's native `UploadFile` handling (already used in `person_issues.py`) plus Pillow if resizing/validation is added later. Deployment target (Oracle Cloud vs. other) is undecided — explicitly deferred, local-disk storage assumed for now.
   - **Frontend**: `WorkerDashboard.tsx`'s report form drops its manual "ISSUE TYPE"/"SEVERITY" dropdowns (AI-decided now) and gets real photo upload wiring — `handlePhotoUpload` is currently fully mocked (sets a boolean, no file ever read — see Section 3d above).
   - **Not in scope / explicitly deferred, not decided**: the environmental sensor-confirmation flow (n8n workflow + live sensor ingestion via websockets, to give the 4 sensor-backed `SiteIssueType`s a real confirmed verdict instead of the LLM's text-only guess). This is an idea only — no schema, endpoint, or phase committed. Full detail in the notes file above.
   - **Read-access role gating, confirmed 2026-09-07 — no n8n, plain role-scoped queries.** A separate idea (routing "which site issue concerns this worker" through an n8n workflow) was considered and rejected: that's a single synchronous DB filter, not a multi-step orchestration — n8n is reserved for the sensor-confirmation flow above, not general visibility filtering, and per-worker location-based relevance can't be computed anyway until Section 2 Phase 4 (checkpoint location) is unblocked. **Verified gap found while reviewing this**: `GET /person-issues` (the general, mine-wide endpoint) currently allows `worker` in its role list (`person_issues.py:50`) — a worker calling it directly would see every worker's PPE violations in the mine, the exact leak `GET /person-issues/me` exists to prevent; the frontend just never happens to call it that way today.
   - **Revised same day, after checking "can a worker/officer see reports they personally filed?"** Flatly removing `worker` from `GET /person-issues` (the fix originally written here) would have closed the leak but also made it *impossible* for a worker to ever see a person-issue report they themselves filed — `GET /person-issues/me` filters by `worker_id` (the offender), not `source_id` (the reporter), so those are two different, non-overlapping sets of issues. **Corrected final design**: `list_person_issues` scopes a `worker` caller to `source_id == their own id` (their own submitted reports only) instead of denying them outright — this still closes the original leak (can't see other workers' violations) while actually answering the visibility question correctly. `SiteIssueResponse`/`PersonIssueResponse` both gain `source_id` in the response so this is checkable. A worker's own site-issue reports were never at risk the same way — `GET /site-issues` stays mine-wide for `worker`/`safety_officer` (their own reports are already inside it, just not isolated from others' — no finer scope possible without checkpoint location). `safety_officer` was never restricted on either endpoint, so they could already see reports they'd made, mixed into the full mine-wide list.
   - **Also confirmed**: `GET /site-issues` and `GET /person-issues` both gain `regulator` and `admin` in their role lists — currently only `worker`/`safety_officer`/`corporate_manager` can call either at all, so `regulator`/`admin` presently cannot browse individual issues through these routes (only via `RegulatoryReport`'s aggregated counts, a separate code path). `regulator` scopes the same way `corporate_manager` already does (their own `profile.mines`, via `accessible_mine_ids`); `admin` gets unscoped/global visibility, matching the existing branch pattern in `routes/mines.py`.
   - **`WorkerReportPage`'s "recent reports" list is dropped, not migrated (confirmed 2026-09-07).** It currently shows only `SiteIssue`s (`GET /site-issues`, refreshed after each submit) — correct today because every manual report from that page was necessarily a `SiteIssue`. Once a submission can land in either collection, keeping it correct would need reporter-scoped (`source_id`) filtering merged across both `GET` endpoints — decided against building that; the immediate post-submit toast (from the new response shape above) is the only feedback this page gives about what was just filed.

3. **Failure-mode hardening for the new pipeline (confirmed 2026-09-07, implemented) — the parts simple enough to fix now, as opposed to Possible Future Issues below.**
   - **Strict AI-output parsing with a hard fallback.** The new classifier (item 2) is an LLM — it will not always return an exact literal match. Any response that doesn't exactly match the known `issue_type`/`severity` vocab must fall back to `other`/a safe default rather than being written to the DB as-is or crashing the request. Same defensive-parsing pattern already used in `rag_engine.check_compliance` (`rag_engine.py:229`, stripping markdown before matching labels) — reuse that approach, don't invent a new one.
   - **Strict step ordering in the `POST /issues` handler**, so a failure at any point leaves a clean, retryable state instead of an orphaned file or a dangling reference: (1) write the photo to `uploads/pending/` and confirm the write succeeded before anything else happens, (2) only then insert the `raw_issue_reports` record, (3) call the AI classifier, (4) only after the final `SiteIssue`/`PersonIssue` document is successfully created, move the photo to its final folder, (5) only after that move succeeds, delete the `raw_issue_reports` record. Failing at any step simply leaves the still-intact raw record + pending photo behind for retry — never a half-written state.
   - **A `updated_at` timestamp field on `raw_issue_reports`**, so a record stuck at `status: "pending"` past a short window (e.g. 5 minutes) can be told apart from one still genuinely being processed. This is a cheap staleness marker, not the retry mechanism itself — see Possible Future Issues below for that.

4. **Inspections removed; its capture mechanism migrates into the unified issue-report flow (confirmed 2026-09-07, implemented).** The `inspections` collection has no read endpoint, no ai_engine involvement, and its only real value (per Section 3e) is `ObservationForm.tsx`'s capture mechanism — real photo/voice capture plus a genuine IndexedDB offline queue (`db.ts` + `useSyncManager.ts`). That mechanism is being redirected at the new `POST /issues` endpoint rather than deleted.
   - **Backend — deleted outright**: `models/inspection.py`, `services/inspection_service.py`, `schemas/inspections.py`, `routes/inspections.py`; `Inspection` removed from `models/__init__.py`'s import and `ALL_MODELS`; the router import and `app.include_router(inspections_router)` removed from `backend/src/main.py`. Confirmed no other backend file references any of these (Section 3e already established zero ai_engine involvement and no other consumers).
   - **`frontend/src/utils/db.ts`**: the `Observation` IndexedDB schema is replaced to match the new Issue shape — `pillar` dropped (no `SiteIssueType`/`PersonIssueType` maps onto safety/environment/production/labour), `photo_urls: string[]` becomes a single `photo_url` (the new models take one photo, not an array), `lat`/`lng` dropped (neither `SiteIssue` nor `PersonIssue` has a coordinate field — location is `level`/`section`, per `location-and-pwa-notes-7-sep.md`'s checkpoint model). This is an IndexedDB version bump, not just a TypeScript type edit.
   - **`frontend/src/hooks/useSyncManager.ts`**: POST target changes from `/inspections/observations` to the new `/issues` endpoint, payload shape updated to match.
   - **Voice-note capture is dropped, not migrated.** It never had a consumer — Inspections had no read endpoint, so a recorded voice note was never played back to anyone — and neither `SiteIssue` nor `PersonIssue` has a voice field. Carrying it forward would just be a second dead capture path.
   - **`frontend/src/hooks/useGeolocation.ts`** loses its only caller (`ObservationForm.tsx`) once `lat`/`lng` drop out of the form. Kept in place (cheap, tiny file) rather than deleted, in case a future surface-level feature wants it — flagged here as fully unused the moment this lands, not currently in use by anything else.
   - **The `/worker` route is removed entirely**: `AppRoutes.tsx`'s `/worker` entry, `pages/worker/WorkerApp.tsx`, and `pages/worker/ObservationForm.tsx` are deleted after migrating the capture logic (photo picker + offline queue, minus voice) into `WorkerDashboard.tsx`'s existing report form. Per Section 0/3's earlier finding, `/worker` was already confirmed unreachable through any real navigation path once guest login was removed (Section 1) — this removes the last reason to keep it as a separate entry point.

---

### Possible Future Issues (Section 3)

Harder items surfaced during this planning pass that need more design/infra time than a hackathon pass affords right now — not started, no phase committed:

- **Automatic retry for `status: "failed"`/stale-`"pending"` `raw_issue_reports`.** Item 3 above makes failures safe (nothing lost, nothing corrupted) but doesn't decide *who or what* reprocesses a failed/stale record — a manual admin action vs. a scheduled sweep job is still an open design choice.
- **Duplicate-submission protection.** No idempotency key exists on `POST /issues` today — a client retrying a slow request (or a flaky double-tap) can create two real issues from one actual report.
- **Person-issue offender identification (1-to-many face search).** Blocked on a real prerequisite: worker face registration isn't populated anywhere today — `ai_engine/data/attendance/registered_faces/` is empty and nothing in the frontend calls the existing `POST /attendance/register-face`. Full task spec in `research/ml-engineer-handoff-7-sep.md`.
- **`equipment_fault` image classifier.** No existing detector; standalone, real vision-model effort. Same handoff file.
- **Environmental sensor-confirmation flow** (n8n + live sensor ingestion via websockets). Exploratory only — full detail in `research/issue-reporting-ai-pipeline-notes-7-sep.md`.
- **Deployment target.** Still undecided — options and open questions in `research/deployment-7-sep.md`.
- **RAG compliance-checking (`/api/rag/check-compliance`) is not wired into the issue pipeline.** Confirmed 2026-09-07: left deliberately unused for now, same as today — no decision to attach legal citations/compliance status to a created issue. Ground truth and the (currently empty) Changes Planned for this capability live in Section 6, not here — not duplicated.

---

## 4. Regulatory Reports — seeding deferred, rest not yet planned

**Backend** — `POST /regulatory-reports` (corporate_manager, must own the mine), `POST /regulatory-reports/{id}/respond` (regulator only, target must be a `corporate_submission`), `GET /regulatory-reports` (corporate_manager or regulator, scoped to their accessible mines). No `GET /{id}`, no update/delete — reports are create/list/respond only, and are **never mutated in place**; a regulator's response is a brand-new document linked back via `parent_report_id`.

**Auto-computed issue counts — exact logic**: on every submission *and* every response, the backend queries **every** `SiteIssue`/`PersonIssue` for that mine with **no date/period filter at all** — it's a live snapshot at the moment of creation, not scoped to the report's stated `reporting_period`. `total` = count of both collections combined; `critical` = SiteIssue severity `CRITICAL` + PersonIssue severity `high`/`critical`; `resolved` = status `resolved` in either collection. Because verifications recompute fresh rather than copying the parent's numbers, a regulator's response can show different counts than the submission it's responding to if issues changed in between — this is by the code's own design, not a bug. `average_resolution_time_hours` is **entirely self-declared by the corporate user** — nothing computes it from real timestamps (no CAPA/resolution-timestamp model exists anywhere in the backend).

**Frontend** — real routes + sidebar links for both roles (`/dashboard/corporate/reports`, `/dashboard/regulatory/reports`), all wired to real endpoints, no mock data. Worth noting: the regulator's "respond" action does **not** live on the Reports page — it's on a separate page, `/dashboard/regulatory/compliance`, which the Reports page itself has no link to respond from (it's read-only).

**Verified gaps**: `reporting_period` is free text — no normalization, so "Sept 2026" vs "September 2026" silently creates two unlinked threads instead of one. Nothing prevents duplicate open submissions for the same mine+period. Regulator's mine-scope is sitewide by design (self-documented in code) — 2+ regulator accounts would see identical data, no per-regulator boundary exists.

**Doc check**: `cleanup-plan.md`'s claim that these dashboards "need a data-layer rework" is stale — they're already fully real. `lld.md`'s description of this feature checked out accurately line-by-line.

### Changes Planned

1. **Seed data deferred, deliberately (confirmed 2026-09-07).** The 3 leftover `RegulatoryReport` documents found in the DB (see Section 3's entry) were dropped and not replaced — this model's structure is expected to be rebuilt from scratch once this section gets a real planning pass, so seeding it now would only be thrown away later. No decisions yet on what that rebuild looks like.

---

## 5. Attendance / Face Verification / Liveness

**Directly resolves Section 0 item 1.** User's starting belief: "only frontend + ai_engine, no backend, no dedicated route." Verdict: **half right, half wrong.**

- **"No backend" — wrong.** `backend/src/models/attendance.py` + `backend/src/routes/attendance.py` are real and load-bearing, not stubs. Every attendance mark flows: Frontend → **Backend** (`POST /attendance/mark`, authenticates the user, resolves mine/site coords) → proxies via `httpx` to ai_engine → **Backend persists the result** to MongoDB (`attendance_records` collection). The frontend never talks to ai_engine directly — the backend is squarely in the middle of every request and owns the record of truth. (Implementation quirk: this proxying is done with raw `httpx` calls inline in the route file, not through the shared `ai_engine_client.py` used by other features — inconsistent pattern, but functional.)
- **"No dedicated frontend route" — correct.** Attendance is purely a modal (`MarkAttendanceModal.tsx`) opened from a button on two existing pages (`/worker` and `/dashboard/worker`) — there is no `/attendance`-style route of its own.

**ai_engine internals**:
- Face match: **DeepFace with the SFace model** (chosen for CPU speed). A docstring claims a Facenet fallback "if SFace unavailable" but this is **not actually implemented** — `FACE_MODEL` is a hardcoded constant, no fallback code exists.
- Liveness: **MediaPipe Face Mesh + Eye-Aspect-Ratio blink detection**, with adaptive per-burst thresholds (handles glasses/lighting) — genuinely more sophisticated than a simple blink flag.
- Geofence: **flat Haversine distance check against one lat/lng point**, 100m radius — **not** level/section/pit-aware in any way, contrary to any assumption that geofencing understands mine structure.

**Image storage — exact answer**: registered reference photos persist permanently to disk (`ai_engine/data/attendance/registered_faces/{worker_id}.ext`, no DB row). Each live attendance check writes its sharpest captured frame to disk too (`temp_selfies/{worker_id}_{timestamp}.jpg`), auto-purged after 24h — but only on a best-effort basis triggered by the *next* successful attendance mark, not a real scheduled job, so stale files can linger indefinitely if nobody marks attendance for a while. MongoDB's `AttendanceRecord.selfie_saved` stores only the **filename string**, never image bytes.

**Verified gaps**: `GET /attendance/today` has no per-user/per-mine filter and no role check — any authenticated user of any role can list every worker's attendance for the day. `register-face` (provisioning a worker's reference photo) has **zero UI** anywhere — must be done out-of-band today (manual file placement or direct API call).

**Doc check — substantially stale**: `lld.md` and `INDEX.md` both currently claim attendance is **"Not built"** and describe an entirely different planned design (a `LabourShift` model with check-in/check-out, manual/proxy check-in for phone-less workers, rest-period computation) — none of that matches what's actually built. The real implementation (single `AttendanceRecord`, camera-only, no check-out, SFace/MediaPipe/Haversine) predates or postdates these docs without ever being reflected in them. This is the single biggest doc/reality gap found across the whole audit so far.

---

## 6. Computer Vision / Predictive Analytics / RAG Assistant — one confirmed decision (no code impact), rest not yet planned

### 6a. Computer Vision / PPE Detection
**ai_engine**: real **YOLOv8** (`ultralytics`), 2-class (helmet/reflective-jacket) detector. Fine-tuned weights (`ai_engine/data/models/best.pt`, 5.7MB) **exist on disk today and would load** (falls back to stock COCO `yolov8n.pt` only if that file is missing — it isn't). Violation logic is a simple rule (helmet/vest counts mismatch), not ML. Endpoint `POST /api/cv/detect`.

**Backend**: called — `person_issue_service.create_person_issue_from_detection()` calls `ai_engine_client.detect_ppe()`, exposed as `POST /person-issues/detect`. Confirmed (again, from this angle) that this endpoint has **zero frontend caller**.

**The one real photo-capture path in the app that could feed this** is `ObservationForm.tsx` (Inspections) — it already collects real image bytes (as base64) that in principle could be piped into `/api/cv/detect`, but nothing currently connects them; that would require new backend glue.

### 6b. Predictive Analytics
**Anomaly detection**: hybrid of hardcoded regulatory thresholds (Coal Mines Regulations 2017-sourced) + a real `sklearn IsolationForest` — but the forest is **fit once at process start on 5,000 synthetic uniform-random samples**, not on any real telemetry history. It's effectively a second, softer set of hardcoded bounds dressed as ML, not a model that has learned this mine's actual sensor behavior. Called from backend (`site_issue_service.create_site_issue_from_reading` → `/site-issues/detect`) — confirmed (again) zero frontend caller and no live sensor stream anywhere to trigger it automatically either.

**Forecasting**: despite historical references to Prophet, this is now plain `numpy.polyfit` linear regression with a widening confidence band — no ML. **Not called from backend at all** (confirmed via full grep) — fully dead code from the product's perspective, built but unreferenced anywhere.

### 6c. RAG Legal Compliance Assistant — full technical picture
Embeddings: `all-MiniLM-L6-v2` (CPU). Chunking: 1000 chars / 150 overlap. Vector DB: ChromaDB, persisted and **populated** (`chroma_db/`, 11.4MB, confirmed on disk today). Source docs: 4 real regulatory PDFs (Coal Mines Regulations 2017, air quality standards, NAAQS 2019). LLM: Groq Cloud — default model constant is `openai/gpt-oss-120b` (note: the file's own docstring comment claims "llama-3.1-8b-instant," which doesn't match the actual default constant — an internal inconsistency inside `rag_engine.py` itself, independent of any external doc).

**Newly found, previously undocumented blocker**: `ai_engine/.env` has `GROQ_API_KEY=` set to an **empty value**. Even called directly (bypassing backend/frontend entirely), the endpoint would currently return a 503 — the RAG feature is not just unwired, it would not actually answer a query right now even via direct API call until a real key is set.

**Confirms Section 0 item 4 from the ai_engine side**: zero references to RAG/`check-compliance` exist anywhere in `backend/src`, and `ai_engine_client.py` has no RAG helper function at all (only `detect_ppe`/`check_anomaly` exist there) — RAG is completely isolated inside ai_engine today, reachable by nothing.

### Summary — reachability across all 3 (Section 6)
| Feature | ai_engine works? | Called by backend? | Reachable from any UI? |
|---|---|---|---|
| CV / PPE detection | ✅ real YOLOv8, fine-tuned weights present | ✅ yes, via `/person-issues/detect` | ❌ no caller |
| Predictive — anomaly | ✅ hybrid rules+IsolationForest (synthetic-trained) | ✅ yes, via `/site-issues/detect` | ❌ no caller, no live sensor feed |
| Predictive — forecast | ✅ real linear regression | ❌ never called | ❌ no caller |
| RAG compliance | ⚠️ built, but currently 503s (empty Groq key) | ❌ never called | ❌ no caller |

### Changes Planned

1. **Left unused, deliberately, for now (confirmed 2026-09-07).** Considered whether the new unified issue-reporting pipeline (Section 3) should call `/api/rag/check-compliance` to attach legal citations/compliance status to a created issue — decided not to, no timeline. Revisit as future work if wanted; the empty `GROQ_API_KEY` (Section 0 item 14) would need fixing regardless, whenever this does get picked up.

---

## Cross-cutting patterns worth noting

- **Every AI capability in this app (CV, anomaly detection, RAG) is backend-ready-or-better but has zero live trigger from any UI.** The gap is consistently the same shape across all three: real, working ai_engine code + (for CV/anomaly) real backend wiring, but nothing in the frontend ever calls the endpoint that would invoke it. This is a much bigger and more consistent gap than any single "feature" — worth deciding as one deliberate push rather than three separate small tasks.
- **Image handling has no shared pattern at all** — three different Issue/Inspection-adjacent features handle "a photo was submitted" three different ways: Site Issues (fake button, nothing sent), Person Issues (field exists, nothing populates it, CV path discards bytes after use), Inspections (real persistence, but as unbounded base64 text inline in Mongo). Attendance is the only feature with real disk-based image storage. Any future "how do we store images" decision should probably design one shared approach rather than patching each separately.
- **The research docs are unevenly stale** — `lld.md` (self-dated as reconciled 2026-09-06) checked out accurately against code in every section except one: it still describes Attendance as "Not built" with a completely different planned data model, which is the single largest doc/reality gap found. `ai_engine_review.md` is stale on two now-fixed points (the fine-tuned CV weights now exist; the RAG vector store is now populated) but was accurate at the time it was written. `cleanup-plan.md`/`architecture.md`/`INDEX.md` mostly describe an older pre-migration codebase state and should probably be retired rather than corrected line-by-line.
