# Implementation Plan — 6 Sections

Companion to `research/feature-audit-6-sep.md`. That file is the ground-truth record of what's built and what's been decided ("Changes Planned" per section). This file is the **execution order** — phases and steps — for whatever has actually been confirmed in discussion so far.

Only sections with confirmed decisions get a real phased plan. The rest stay as placeholders until decisions land in the audit file. A **DONE** note under a phase means it's been executed and verified live, not just written.

---

## 1. Auth / Guest Login / User & Access Management — DONE (2026-09-06)

### Phase 1 — Create role-profile classes (with `mine`/`mines` inside), wire `User.profile`, retire `MineAssignment` entirely

**Goal**: mine-scope data lives inside per-role profile classes, not as flat nullable fields on `User`; `mine_assignments` collection and every reader/writer of it is gone; every place that shows or depends on mine information keeps working against the new shape.

**Why `mine`/`mines` live inside the profile classes, not flat on `User`**: a worker will never have `mines`, a corporate manager will never have `mine` — flat fields would reintroduce exactly the cross-role-null problem the profile classes exist to prevent. Putting them inside the role-specific class means a worker's document simply has no `mines` key at all, not a `mines: null`.

**Resolved (2026-09-06)**: `WorkerProfile` and `OfficerProfile` are both shaped exactly `{mine: ObjectId}` — structurally identical to each other, so Pydantic's *automatic* discriminated-union resolution can't tell them apart on shape alone. Decided: don't rely on that automatic resolution at all — `User.role` already exists and already disambiguates unambiguously, so application code reads `user.role` and manually picks which class to instantiate/parse the `profile` data into (`if role == "worker": WorkerProfile(**data)`, etc.), explicitly, everywhere `profile` gets read or written. No new tag/discriminator field needed.

1. Create `backend/src/models/worker_profile.py` — `class WorkerProfile(BaseModel): mine: Optional[PydanticObjectId] = None`.
2. Create `backend/src/models/officer_profile.py` — `class OfficerProfile(BaseModel): mine: Optional[PydanticObjectId] = None`.
3. Create `backend/src/models/corporate_profile.py` — `class CorporateProfile(BaseModel): mines: list[PydanticObjectId] = []`.
4. Create `backend/src/models/regulator_profile.py` — `class RegulatorProfile(BaseModel): mines: list[PydanticObjectId] = []`.
5. Create `backend/src/models/admin_profile.py` — stays genuinely empty; admin has no mine-scope concept at all (global access).
6. `backend/src/models/user.py` — add `profile: Optional[WorkerProfile | OfficerProfile | CorporateProfile | RegulatorProfile | AdminProfile] = None`, resolved per the open question above.
7. `backend/src/auth/dependencies.py` — rewrite `accessible_mine_ids(user)`: `worker`/`officer` → `[user.profile.mine]` if set else `[]`; `corporate_manager`/`regulator` → `user.profile.mines`; `admin` unchanged (global). No DB query needed at all (was a `MineAssignment` lookup before).
8. `backend/src/auth/dependencies.py` — rewrite `require_mine_assignment(user)` to read `user.profile.mine` directly (400 if `None`/no profile).
9. Delete `backend/src/models/mine_assignment.py`.
10. Delete `backend/src/services/mine_assignment_service.py` (`ensure_mine_assignment`).
11. Delete `backend/src/routes/mine_assignments.py`, remove its router registration from `main.py`.
12. `backend/src/services/provision_service.py` — replace "create a `MineAssignment`" with "construct the right profile object (`WorkerProfile(mine=...)` / `OfficerProfile(mine=...)` / `CorporateProfile(mines=[...])` / `RegulatorProfile(mines=[...])`) and set it directly on the new `User.profile`." The existing rule ("actor's new-user mine must be within the actor's own accessible scope") now reads the **actor's own** `profile.mine`/`profile.mines` instead of querying `MineAssignment`.
12a. **Same file, `change_role` (confirmed 2026-09-06)** — fixes a newly-found equivalent of the Section 0 item 13 bug (the original mechanism, a stale `MineAssignment.role` snapshot, is already eliminated by this phase deleting `MineAssignment` outright; this is a *different*, structurally identical risk in the new design). Today `change_role` only does `target.role = new_role; save()`, never touching `target.profile` — once `profile` is role-typed, that leaves a user with e.g. `role="corporate_manager"` but a stale `WorkerProfile` still attached. Fix: alongside setting `target.role`, `change_role` also replaces `target.profile` with a fresh **empty** instance of the new role's profile class (e.g. `officer → corporate_manager` discards the old `OfficerProfile` and sets a brand-new `CorporateProfile(mines=[])`) — no data carried over, same mine-less philosophy as step 19's new-user creation, applied to role-changes too.
13. **Resolved (2026-09-06)**: `backend/src/schemas/users.py` (`UserResponse`) and `GET /auth/me`'s `CurrentUserResponse` currently both expose a flat, synthetic `mine_ids: list[str]` for every role — decided this goes away. Both response schemas instead return the mine scope **exactly as stored**: `mine: Optional[str]` (populated for worker/officer, `None` for corporate/regulator/admin) and `mines: list[str]` (populated for corporate/regulator, `[]` for worker/officer/admin) — a direct mirror of `profile.mine`/`profile.mines`, not a derived/flattened field invented for display convenience. Reasoning: inventing a uniform display shape now is exactly the kind of cross-layer inconsistency this whole cleanup is meant to remove — better to keep backend, and everything downstream of it, honest about which fields actually apply per role from day one. **Note**: `accessible_mine_ids(user)` (the internal backend helper used for query scoping, e.g. "issues where `mine_id in accessible_mine_ids(user)`") stays a flat list return type — that's a different, legitimate need (uniform filtering across routes) and is not the same thing as the API response shape shown to the frontend. Don't conflate the two.
14. **Confirmed via grep — ai_engine has zero involvement in this change.** No reference to `mine_id`/`mine_ids` exists anywhere in `ai_engine/src/`; that layer only ever receives lat/lon and worker/site identifiers already resolved by the backend. Nothing to update there for this phase.
15. **`/dashboard/admin/access` folds into `/dashboard/admin/users` entirely (confirmed 2026-09-06).** Today's `AdminAccessPage` only exists because mine-assignment CRUD didn't fit naturally under Users or Mines — once assigning a mine is just editing a `User.profile` field, that reason is gone. Concretely: remove the `/dashboard/admin/access` route from `frontend/src/routes/AppRoutes.tsx` and its "Access" entry from `Sidebar.tsx`'s admin nav items; move both capabilities directly into `AdminUsersPage` (`AdminDashboard.tsx`) — the per-user role-change control (already there in spirit via `PATCH /users/{id}/role`) and the mine-assignment editor (a single mine-picker dropdown for worker/officer rows, a multi-select for corporate/regulator rows) both become part of each user's row/detail in the one Users page, instead of a separate page.
16. **Frontend impact — verified by grep, not approximated** (every real reference to `mine_ids`/`.mine_id` across `frontend/src`):
    - `frontend/src/store/authStore.ts:13` — `CurrentUser.mine_ids: string[]` type replaced with `mine?: string | null` + `mines?: string[]`, matching the resolved backend shape from step 13.
    - `frontend/src/components/views/AdminDashboard.tsx:22` — a **second, separate** `AdminUser` type (used only for the `GET /users` directory listing, independent of `CurrentUser`) also has its own `mine_ids: string[]` — needs the identical fix, on its own, since it's a distinct type.
    - `AdminDashboard.tsx:203` — directory row currently renders `{u.mine_ids.length} mine(s)` uniformly for every role. Needs to branch: worker/officer rows show the single mine's name (or "no mine assigned"), corporate/regulator rows show a count/list.
    - Four **near-identical duplicated** lines, one per role's Profile page — `WorkerDashboard.tsx:516`, `SafetyOfficerDashboard.tsx:278`, `CorporateDashboard.tsx:306`, `RegulatoryDashboard.tsx:396` — all currently do the exact same `user?.mine_ids?.length ? "N assigned" : "None assigned"` check. Worker's and Officer's need to change to show their one mine directly (or "None assigned"); Corporate's and Regulator's can keep an "N assigned" list-count style, now reading `mines` instead of `mine_ids`.
    - `AdminDashboard.tsx:407,410` — reads `a.mine_id` off a `MineAssignment` API response object inside today's `/access` table. This code doesn't get retyped — it's **deleted outright** as part of removing `MineAssignment` and folding `/access` into `/users` (step 15), replaced by the new mine-editor UI built directly into `AdminUsersPage`.
    - **Confirmed unaffected, so as not to conflate two different things**: `frontend/src/utils/safetyIssues.ts:83,97` and `frontend/src/components/common/IssueRow.tsx:31` reference `issue.mine_id` — which mine a **Site/Person Issue** belongs to, a completely different field on a different model. Nothing about this phase touches those.
17. **Separate legacy path, not touched by this phase but worth flagging**: `backend/src/services/org_service.py::ensure_placeholder_org` (used by `inspection_service.create_manual_observation`) still falls back to the **old legacy `User.mine_id`** field — a different, pre-existing field, unrelated to `profile.mine`. This will need reconciling whenever Inspections gets migrated into Person/Site Issues (tracked separately, Section 3), not as part of this phase.
18. The Regulator "derived sitewide scope" hack in `accessible_mine_ids` (deriving visibility from every active corporate_manager assignment) is fully retired by this phase, not repointed — regulators get their own real `profile.mines` instead, same as corporate managers.
19. **Confirmed (2026-09-06)**: a newly created user's `profile.mine`/`profile.mines` starts empty — `provision_service.provision_user` (step 12) never sets a mine at creation time regardless of role. `AdminUsersPage`'s create form does **not** need a role-conditional mine-picker. Assigning a mine is a separate, later edit action on the same user row (per the `/access` fold-in, step 15) — not part of the creation flow.

**Checkpoint**: a worker/officer resolves their single mine correctly from `user.profile.mine`; a corporate/regulator resolves their mine list correctly from `user.profile.mines`; `mine_assignments` collection has zero readers/writers left anywhere in the codebase; Admin can still grant/revoke mine access per user, now via profile field edits instead of assignment records; every frontend page that showed mine info before still shows it correctly.

**DONE (2026-09-06)** — executed exactly as scoped, plus two admin-only endpoints not spelled out in the original steps but required to make the `/access` fold-in real: `PATCH /users/{id}/mine` and `PATCH /users/{id}/mines`, each rejecting the wrong role shape with a 400. `User.profile` is stored as a plain `dict`, not a typed union field — `get_profile()`/`set_profile()` in `models/user.py` do the manual role-based resolution. `AdminAccessPage` was deleted outright; its role-change and mine-editor UI now live inline in `AdminUsersPage`, shown when a directory row is selected (single mine-picker for worker/officer, checkbox multi-select for corporate/regulator). The create-user form no longer collects a mine at all.

Found and fixed two ripple effects the plan's step list didn't name: `routes/attendance.py` queried `MineAssignment` directly (routed through `accessible_mine_ids` instead), and `routes/mines.py`'s auto-grant-on-mine-creation used `ensure_mine_assignment` (replaced with a direct append to the creator's own `profile.mines`).

Verified live against the running backend, not just read: logged in as all 5 seeded roles and confirmed `/auth/me`'s `mine`/`mines` shape per role; created a user via `POST /users` and confirmed it came back mine-less; `PATCH /mine` and `PATCH /mines` both round-tripped correctly; changing a role reset the profile (confirmed via API response); `PATCH /mines` on a single-mine role correctly returned 400; `GET /mine-levels`, `/site-issues`, `/person-issues` (cross-mine as corporate), `/regulatory-reports`, `/mines` all still resolved correctly under the new scope logic; `GET /mine-assignments` and `POST /auth/guest` both confirmed 404. `tsc --noEmit` and `vite build` clean.

One technical finding worth keeping in mind, not a bug: `profile.mine`/`profile.mines` end up stored in MongoDB as plain strings, not native BSON ObjectId (Beanie's `PydanticObjectId` serializes to `str` on `model_dump()` regardless of mode). Confirmed harmless end-to-end — `get_profile()` correctly re-hydrates a real `PydanticObjectId` on read, and a live Mongo `In()` query against it returned correct results — but worth knowing if anyone ever queries `profile.mine` directly with raw Mongo tooling instead of going through the app.

---

### Phase 2 — Remove `subsidiary_id` and `role_title` everywhere

**Goal**: `Subsidiary` concept fully gone; `role_title` (confirmed dead weight — zero frontend consumers) fully gone.

1. Delete the `Subsidiary` class from `backend/src/models/mine.py`.
2. Remove `subsidiary_id` field from `Mine` (`backend/src/models/mine.py`).
3. Remove `subsidiary_id` field from `User` (`backend/src/models/user.py`).
4. Grep for any remaining reference (`subsidiary`, `Subsidiary`) across `backend/src` and `frontend/src` and remove.
5. Remove `role_title` field from `backend/src/models/user.py`.
6. Remove `role_title` from both schema locations in `backend/src/schemas/users.py` (`CreateUserRequest` and `UserResponse`).
7. Remove the `role_title` parameter/pass-through from `backend/src/services/user_service.py` and `backend/src/services/provision_service.py`.
8. Remove the `role_title` read/construction in `backend/src/routes/users.py`.
9. Remove the `role_title` value from each entry in `backend/scripts/seed_users.py`.
10. Grep for any remaining reference to `role_title` across `backend/src`, `backend/scripts`, and `frontend/src` and remove (the one occurrence in `auth/guest.py` is moot — that file is deleted whole in Phase 3).

**Checkpoint**: zero references to `subsidiary`/`Subsidiary`/`role_title` anywhere in the codebase.

**DONE (2026-09-06)** — executed as scoped. Found one more real reference the plan's step list didn't catch: `services/mine_service.py::create_mine` still constructed `Mine(subsidiary_id=None, ...)`, which would have failed once the field was removed — fixed. `services/org_service.py::ensure_placeholder_org` (which created the `Subsidiary` document) was renamed to `ensure_placeholder_mine` and rewritten to return just a `Mine`, its only two callers (`seed_users.py`, `inspection_service.py`) updated to match. Verified via full grep across `backend/src`/`backend/scripts`: zero remaining hits for `subsidiary`/`Subsidiary`/`role_title`. Backend re-imports and boots clean.

---

### Phase 3 — Remove guest login entirely

**Goal**: only email/phone + password login remains; no guest concept anywhere.

**Previously-open item — now RESOLVED (2026-09-06)**: confirmed via `Dashboard.tsx`'s own code comment that `/worker` is reached only through the guest-login flow's `DASHBOARD_PATH_BY_ROLE` map — a normal password-logged-in Worker is redirected to `/dashboard/worker` instead, never `/worker`. Removing guest login does not strand any real user; `/worker` simply becomes unreachable via any navigation, nothing further to reconcile.

**Sequencing, confirmed (2026-09-06)**: guest login itself is removed here, in this Section 1 phase — not deferred. `/worker`'s own route registration and component files (`WorkerApp.tsx`, `ObservationForm.tsx`, `db.ts`, `useSyncManager.ts`) are **not** touched by this phase; they're left in place, dormant. The real Inspection-capture mechanism inside them gets extracted into Person/Site Issue creation as part of Section 3's future plan (not yet written) — only at that point do `/worker`'s route and orphaned files actually get deleted, as the last step of *that* work, not this one.

1. Backend: delete `backend/src/auth/guest.py` in full (`GUEST_SEED_USERS`, `ensure_guest_users_seeded`, `get_guest_user`).
2. Backend: remove `POST /auth/guest` from `backend/src/routes/auth.py`, remove `login_as_guest` from `backend/src/services/auth_service.py`.
3. Backend: remove `is_guest` field from `backend/src/models/user.py`.
4. Backend: delete the guest-seeding script (`backend/scripts/seed_guests.py` or equivalent — confirm exact filename at execution time).
5. Frontend: remove "Explore as Guest" / "Continue as Guest" UI from `LandingPage.tsx`, remove `loginAsGuest` from `authStore.ts`.
6. Frontend: remove any remaining `is_guest` reads (e.g. `GET /auth/me` response consumers).
7. DB: remove existing guest user documents (part of the Phase 4 reseed, not a separate manual delete).
8. `research/lld.md`: guest-login documentation update — explicitly deferred by you until after this and other structural changes are actually implemented. Not part of this phase.

**Checkpoint**: zero references to `guest`/`is_guest` anywhere in backend or frontend source; login only works via email/phone + password.

**DONE (2026-09-06)** — executed as scoped. `LandingPage.tsx` needed more than button removal: its entire "Explore by Role" section was 100% guest cards, so that whole block is gone — the page is now just the hero (title, description, single "Operator Login" button) plus the existing 4-pillars feature grid. `DASHBOARD_PATH_BY_ROLE` (`utils/userTypes.ts`) removed too, since guest login was its only caller. Found `is_guest` "Guest session" text on all 5 role Profile pages (Worker/Officer/Corporate/Regulator/Admin), not just some — removed from all 5. Verified live: `POST /auth/guest` → 404; full grep sweep of both `backend/src` and `frontend/src` returns zero hits for `guest`/`is_guest`/`GuestLogin`/`loginAsGuest`.

---

### Phase 4 — Rewrite seed data and reseed from a clean slate

**Goal**: seed scripts produce the final target `User` shape (no `subsidiary_id`, no `is_guest`, `profile.mine`/`profile.mines` set directly, no `MineAssignment` creation); dev DB is wiped and reseeded once, after every other Section 1 phase above has landed — not before, to avoid reseeding multiple times against a moving schema.

1. Rewrite `backend/scripts/seed_users.py`: set each seeded `User`'s `profile` to the correct role-shaped object directly, no `MineAssignment` calls, no `subsidiary_id`, no `is_guest`.
2. Drop the `users` and `mine_assignments` collections (the latter simply won't exist post-Phase-1, confirming cleanup).
3. Run the rewritten seed script against a clean DB.
4. Manually verify: each of the 5 seeded accounts logs in via password, resolves to correct mine scope, and every previously-working endpoint (issues, map, reports) still returns correct data for that account.

**Checkpoint**: fresh DB, all 5 real (non-guest) seeded accounts functional end-to-end.

**DONE (2026-09-06)** — `users`, `mine_assignments`, and `subsidiaries` collections dropped from the dev DB; `seed_users.py` rewritten to build each user's `profile` directly via `empty_profile_for_role()` and set `mine`/`mines` on it, no `MineAssignment` calls anywhere. Ran `docker compose exec backend python -m scripts.index` against the clean DB — all 6 seed entries (5 roles, one role with two accounts) inserted correctly. Confirmed live: each of the 5 real accounts logs in with `test123` and resolves the correct mine scope through `/auth/me`; backend cold-restarted (`docker compose restart backend`) and came up clean.

---

### Note — not a phase (no code impact)

Going forward, refer to this whole feature as **"User & Role Management"**, not "...(Admin)" — already agreed, purely a documentation/conversation convention, nothing to implement.

---

## 2. Mine / Levels / Map / Geolocation — Phases 1–3 DONE (2026-09-07), Phase 4 blocked

### Phase 1 — Persist mine-level diagrams server-side

**Goal**: `MineLevel` carries real, stored per-section polygon data; the frontend renders it directly instead of generating it.

1. Extend `MineLevel` with the computed layout — e.g. `sections: list[{section: int, polygon: list[tuple[float, float]]}]`.
2. Port the existing Voronoi generation (seeded points → convex hull → cells) from `MineLevelMap.tsx` into a one-time backend/script computation, run once per `MineLevel` row (existing rows backfilled, new rows generated at creation).
3. `GET /mine-levels` response includes each level's `sections` polygon data.
4. `frontend/src/components/MineLevelMap.tsx` — delete the client-side PRNG/convex-hull/Voronoi generation code entirely; render directly from the polygons the API returns.

**Checkpoint**: the map renders identically (or intentionally differently, if layouts get customized later) purely from backend data — no generation logic left in the frontend.

**Confirmed (2026-09-07)**: `MineLevel` creation stays seed-script-only for now, deliberately — no `POST /mine-levels` in this phase. The goal is only to show a real map works, not to build general mine-map-creation tooling yet.

**DONE (2026-09-07)** — the Voronoi generation (seeded jitter → convex hull → half-plane-clipped cells) was ported line-for-line from `MineLevelMap.tsx` into a new `backend/src/services/mine_layout_service.py::generate_level_layout(level, count)`, returning `boundary`, `view_box`, and per-section `polygon`/`centroid`. `MineLevel` gained `boundary`, `view_box`, `sections: list[SectionLayout]`; `MineLevelResponse` mirrors it. `seed_users.py::ensure_mine_levels_seeded` now calls the generator at creation time and stores the result. `MineLevelMap.tsx` had all its generation code (`rand`, `hullOf`, `clipHalfPlane`, `polyCentroid`, `buildLayout`) deleted — it now just converts the returned polygons to SVG `d=` path strings and positions labels from the given centroids (pure display formatting, confirmed no leftover generation logic via grep). `mine_levels` collection dropped and reseeded. Verified live: `GET /mine-levels` returns real per-section polygon/centroid/boundary data for both demo mines' 3 levels each.

---

### Phase 2 — Widen mine/level visibility to all roles

**Goal**: corporate, regulator, and admin can view any mine in their scope, not just worker/officer's one implicit mine.

1. `backend/src/routes/mine_levels.py` — accept a `mine_id` query parameter.
2. Scope check per role: worker/officer unchanged (their one mine); corporate_manager/regulator must supply a `mine_id` present in their own `profile.mines` (403 otherwise); admin may supply any `mine_id`.
3. Widen `require_role(...)` on this route to include `corporate_manager`, `regulator`, `admin`.
4. Frontend `MineMapPage` — add a mine-picker (fetch `GET /mines` first) for the three roles that don't have one implicit mine; worker/officer see no picker, unchanged.
5. **`MineLevelMap.tsx` fix (confirmed, required for this phase to be correct)**: change the issue-matching key from `${level}-${section}` to `${mine_id}-${level}-${section}`, and filter the fetched `person-issues`/`site-issues` down to the currently-selected mine before matching. `PersonIssue`/`SiteIssue` already carry `mine_id` — no backend change needed, frontend-only.

**Checkpoint**: a corporate/regulator/admin account can select any mine in their scope and see its real level/section map, with issue coloring correctly scoped to that one mine only (verify with two mines that share a level+section number, if seed data allows).

**DONE (2026-09-07)** — `GET /mine-levels` now takes an optional `mine_id` query param: worker/officer unchanged (their one implicit mine via `require_mine_assignment`), corporate/regulator require `mine_id` and get 403 if it's not in their own `accessible_mine_ids`, admin requires `mine_id` with no scope check. `MineLevelMap.tsx` gained a mine-picker (via the shared `fetchMines()` helper) shown only for `corporate_manager`/`regulator`/`admin`; worker/officer see no picker, unchanged. The confirmed issue-matching fix landed as designed — key changed from `${level}-${section}` to `${mine_id}-${level}-${section}`, filtered to the selected mine for multi-mine roles (no filter needed for single-mine roles, since their fetched issues already belong to only their one mine). No backend change was needed for this fix, confirmed — `PersonIssueResponse`/`SiteIssueResponse` already returned `mine_id`. Verified live: worker's `/mine-levels` unchanged (200, no param needed); admin without `mine_id` → 400; admin with a real `mine_id` → 200 with that mine's 3 levels.

---

### Phase 3 — Public mines endpoint + Landing page map

**Goal**: the landing page shows a real map of India with every mine plotted, before login.

1. New unauthenticated route, e.g. `GET /mines/public` — returns only `{id, name, lat, lng}` per mine, nothing else.
2. `LandingPage.tsx` — add a Leaflet map (first real use of the already-installed `leaflet`/`react-leaflet`), fetch `/mines/public`, plot one marker per mine.

**Checkpoint**: landing page (pre-login) shows a real India map with markers matching the actual mines in the DB.

**DONE (2026-09-07)** — `GET /mines/public` added (no auth dependency at all), reusing the existing `MineResponse` schema. `LandingPage.tsx` gained a "Where We Operate" section with a real `react-leaflet` `MapContainer` centered on India, fetching `/mines/public` and plotting a marker per mine (OpenStreetMap tiles). Needed the standard Leaflet-under-a-bundler fix — re-pointing `L.Icon.Default`'s marker image URLs at Vite-resolved imports, since the default asset paths break under any bundler otherwise. Verified: backend `curl` confirms `/mines/public` returns both demo mines with no Authorization header sent; `tsc --noEmit` and `vite build` both clean; started the dev server and confirmed it serves the page and resolves `react-leaflet`/`leaflet` imports with no console/startup errors. **Not verified**: actual visual rendering in a browser — no browser tooling was available this session, so the map's on-screen appearance itself wasn't eyeballed, only its build/serve correctness.

**Follow-up, DONE (2026-09-07)**: extracted the map into its own standalone component, `frontend/src/components/IndiaMineMap.tsx` (props: `height`, `zoom`), rather than leaving it inline in `LandingPage.tsx` — so it can be reused or moved to a dedicated page later without duplicating the Leaflet setup/icon-fix code. `LandingPage.tsx` now just renders `<IndiaMineMap />`. `tsc --noEmit` clean after the extraction.

**Phase 4 remains blocked**, unchanged — still waiting on who performs the section check-in (worker vs. officer), per the earlier decision to solve this later.

---

### Phase 4 — In-mine checkpoint location — blocked, not yet phased

**Blocked on one open decision**: who performs the section check-in — the worker themselves, or their Safety Officer. No concrete steps until this is answered (see `feature-audit-6-sep.md` Section 2, Changes Planned item 5).

Once answered, this phase covers: adding `current_level`/`current_section` to the appropriate profile, a write endpoint scoped to whoever performs the check-in, rendering a worker's position on the map at their current section, pre-filling `WorkerReportPage`'s level/section from it, and reusing the existing Inspections IndexedDB/`useSyncManager` pattern for offline capture. Full reasoning already written up in `research/location-and-pwa-notes-7-sep.md`.

---

### Note — not a phase (confirmed no-op)

Attendance needs no changes for any of the above — its existing GPS+geofence check is a separate, correctly-scoped concern (surface clock-in, not in-mine section tracking).

## 3. Person Issues / Site Issues / Inspections — Phases 1–4 DONE (2026-09-07)

### Phase 1 — Real seed data for Site/Person Issues

**Goal**: replace leftover, undocumented manual data in `site_issues`/`person_issues` with a real, idempotent seed script.

1. New `backend/scripts/seed_issues.py` (`seed_issues()`), following the established one-file-per-collection convention — 4 `SiteIssue` (3 on ECL, 1 on BCCL, spanning Levels A/B/C, mixed WARNING/CRITICAL) + 1 `PersonIssue` (ECL, `no_helmet`, linked to the real seeded worker's `worker_id`). Idempotent — skips entirely if any `SiteIssue`/`PersonIssue` already exists.
2. Wired into `scripts/index.py` after `seed_users()`.
3. Dropped the leftover `site_issues`(4)/`person_issues`(1)/`regulatory_reports`(3) collections (the first two had a duplicate and an out-of-range section — see `feature-audit-6-sep.md` Section 3 for detail) and reseeded from clean.

**Checkpoint**: worker's `GET /person-issues/me` shows their own seeded issue; worker's `GET /site-issues` shows only their own mine's 3 (not BCCL's); no duplicate or out-of-range data remains.

**DONE (2026-09-07)** — executed exactly as scoped. Verified live: worker login → `/person-issues/me` returns the seeded issue with the correct `worker_id`; `/site-issues` returns exactly 3 (ECL's) not 4; final DB counts confirmed via direct query (`site_issues: 4`, `person_issues: 1`, `regulatory_reports: 0` — not reseeded, deliberately, see Section 4). The Section 2 mine-matching fix was independently re-verified against a synthetic collision scenario at the same time (same level+section on two mines, one open one resolved) — correctly did not cross-contaminate.

---

### Phase 2 — Unified, AI-routed issue reporting

**Goal**: one endpoint replaces manual `SiteIssue`/`PersonIssue` creation; the human only supplies a description + optional photo, the AI decides the collection and type, and nothing is lost if the AI call fails.

**Depends on**: the new ai_engine classifier endpoint (`research/ml-engineer-handoff-7-sep.md`, item 1) — until that exists, this phase's backend code can still be written and deployed, it just means every submission ends up `status: "failed"` in `raw_issue_reports` until the classifier ships. Not a reason to delay writing the backend code.

1. `backend/src/models/person_issue.py` — add `source_id: Optional[str] = None`; narrow `PersonIssueType` to `Literal["no_helmet", "no_vest", "other"]` (drop `unsafe_practice`).
2. `backend/src/models/site_issue.py` — add `source_id: Optional[str] = None` **and `photo_url: Optional[str] = None`** (confirmed 2026-09-07 — mirrors `PersonIssue`'s field exactly, so a photo attached to a report the AI classifies as a site issue isn't silently discarded).
3. New `backend/src/models/raw_issue_report.py` — `RawIssueReport(Document)`: `source_id: str`, `mine_id: PydanticObjectId`, `level: str`, `section: int`, `observation: str`, `photo_path: Optional[str]`, `status: Literal["pending", "classified", "failed"]`, `created_at`, `updated_at` (the staleness marker Phase 3 relies on — added now since this collection is brand new, no separate migration needed later).
4. `backend/src/models/__init__.py` — add `RawIssueReport` to the import and `ALL_MODELS`.
5. `backend/src/services/ai_engine_client.py` — add `classify_issue(observation: str) -> dict`, calling the new ai_engine endpoint `POST /api/issues/classify` (exact path specified in `ml-engineer-handoff-7-sep.md` item 1) with the contract given there.
6. New `backend/src/services/raw_issue_report_service.py` — the pipeline: save the photo (if any) to `uploads/pending/`, insert the `RawIssueReport`, call `classify_issue`, then branch:
   - **Success**: create the real `SiteIssue`/`PersonIssue` via the existing `site_issue_service.create_site_issue`/`person_issue_service.create_person_issue` (reused as-is, `source="manual"`, `source_id=str(user.id)`, `photo_url` set on `SiteIssue` too now per step 2), move the photo from `uploads/pending/` to `uploads/site_issues/` or `uploads/person_issues/`, delete the `RawIssueReport`.
   - **Failure**: leave the `RawIssueReport` as `status: "failed"`, photo stays in `uploads/pending/`.
7. New `backend/src/schemas/issues.py` — `IssueCreateResponse`, the `{target, issue}` wrapper detailed in step 10 (`issue: SiteIssueResponse | PersonIssueResponse`, imported from the existing schema modules, not redefined).
8. New `backend/src/routes/issues.py` — `POST /issues`, multipart (`observation: str = Form(...)`, `level: str = Form(...)`, `section: int = Form(...)`, `photo: Optional[UploadFile] = File(None)`), `mine_id` resolved via `require_mine_assignment(user)` same as today. **Role gating (confirmed 2026-09-07)**: `require_role("worker", "safety_officer")` — no restriction between the two; the AI decides the destination collection, not the caller's role, so a worker's submission is free to land in either.
9. `backend/src/routes/site_issues.py` / `backend/src/routes/person_issues.py` — remove `POST /site-issues` and `POST /person-issues` (manual creation) entirely, fully unified into the one new endpoint from step 8. `/site-issues/detect` and `/person-issues/detect` (sensor/camera-triggered, a different mechanism entirely) are untouched.
10. `backend/src/main.py` — register the new `issues_router`. **Response schema for `POST /issues` (confirmed 2026-09-07)**: `IssueCreateResponse` (step 7) returns `{"target": "site_issue" | "person_issue", "issue": SiteIssueResponse | PersonIssueResponse}`. The frontend always knows which shape `issue` is from `target`, no inference needed.
11. **Read-access role gating (confirmed 2026-09-07, revised same day after checking "can a worker see reports they personally filed?")** — `backend/src/routes/site_issues.py::list_site_issues` and `backend/src/routes/person_issues.py::list_person_issues`:
    - Both gain `regulator` and `admin` to their `require_role(...)` list (currently only `worker`/`safety_officer`/`corporate_manager` can call either).
    - `SiteIssueResponse`/`PersonIssueResponse` both gain `source_id: Optional[str] = None`, mirroring the model field added in steps 1–2 — needed so the frontend can ever identify "reported by me" within a list. `SiteIssueResponse` additionally gains `photo_url: Optional[str] = None` (step 2's new model field).
    - **`_to_response()` in both `routes/site_issues.py` and `routes/person_issues.py` must be updated too, not just the schema classes** — both currently construct their response object with every field explicitly named (verified by reading both), so a field added to the model/schema but not to this explicit constructor call would silently stay absent from every API response. This is the exact same bug class already found once in this codebase (`PersonIssue.photo_url` existing on the model with nothing ever populating it) — don't repeat it by adding fields to the schema and forgetting this step.
    - `list_site_issues` branches three ways: `admin` → unscoped/global (matches `routes/mines.py`'s existing admin branch); `corporate_manager`/`regulator` → their own `accessible_mine_ids(user)`; `worker`/`safety_officer` → their one mine via `require_mine_assignment(user)`, unchanged, mine-wide (a worker's own site-issue reports are already visible within it, just not isolated — no finer per-worker scope is possible without Section 2 Phase 4's checkpoint location, still blocked).
    - `list_person_issues` branches four ways: `admin`/`corporate_manager`/`regulator` as above (full/broad scope); `safety_officer` → their one mine, unchanged (mine-wide, unrestricted); **`worker` → scoped to `source_id == str(user.id)`** (their own submitted reports only), not denied outright. This still closes the original leak (a worker can no longer see every other worker's PPE violations via this endpoint) while actually answering "can I see the report I just filed" — which flatly locking `worker` out would not have. `GET /person-issues/me` (filtered by `worker_id`, the offender field) is unchanged and stays a separate, correct thing — issues *about* the worker, not issues *filed by* them.
12. Frontend `WorkerDashboard.tsx` — remove the manual "ISSUE TYPE"/"SEVERITY" dropdowns from the report form; wire the "Add Photo" button to a real file input (currently fully mocked, `handlePhotoUpload` just flips a boolean); POST to the new `/issues` endpoint instead of `/site-issues`, read the `{target, issue}` response for the confirmation toast.
13. `WorkerReportPage`'s "recent reports" list (confirmed 2026-09-07) — **dropped**, not migrated to merge both collections. `fetchSiteIssues`/`siteIssues` state and the list's JSX are removed from the page entirely; the step-12 toast (which collection/type it was filed as) is the only post-submit feedback going forward. Reporter-scoped filtering (`source_id`) isn't being added to either `GET` endpoint.

**Checkpoint**: a worker/officer can submit a text description (+ optional photo) once; it ends up in the correct collection with the correct type/severity once the classifier responds; `POST /site-issues` and `POST /person-issues` both 404.

**DONE (2026-09-07)** — executed exactly as scoped, plus several concrete pieces the plan named only as a decision, not a file: a new `backend/src/uploads.py` module (`save_pending_photo`/`move_to_final`) backing the `uploads/pending|site_issues|person_issues/` folders; `docker-compose.yml` gained a `./uploads:/app/uploads` bind mount (without it, "root-level uploads/ folder" would only have existed inside the container, not on the host — verified by writing a real photo through the API and confirming it landed in the host's `uploads/pending/`); `main.py` mounts `/uploads` via `StaticFiles` so `photo_url` values are actually servable, not just stored (the exact "field exists, nothing serves it" bug class flagged elsewhere in this plan); `.gitignore` ignores upload contents but keeps `.gitkeep` placeholders, matching the existing `ai_engine/data/attendance/` pattern.

`_to_response` was renamed to `to_response` (un-prefixed) in both `routes/site_issues.py` and `routes/person_issues.py`, needed so `routes/issues.py` can import and reuse them rather than duplicating response-building logic. `POST /issues` returns `IssueCreateResponse | None` (not just `IssueCreateResponse`) — `None` on the classification-failed path, matching the existing `SiteIssueResponse | None` convention already used by `/detect`. Severity fallback when the AI gives a usable `target` but an out-of-vocab `severity`: `"WARNING"` (site) / `"medium"` (person) — the plan specified `issue_type` always falls back to `"other"` but didn't name a severity default, so these were chosen as the same kind of safe middle-ground default. New service functions needed for the read-access role-branch rewrite: `list_all_site_issues`, `list_all_person_issues`, `list_person_issues_by_source`.

**Frontend refinement beyond the plan's literal steps**: `WorkerReportPage`'s submit handler tries a direct `POST /issues` first while online (not always via the offline queue) specifically so it can read the real `{target, issue}` response for the confirmation toast, per step 12's explicit requirement — only falls back to the IndexedDB queue on an actual network failure (no `err.response` at all), not on a server-side rejection (400/403), so a real validation error still surfaces as an error toast instead of being silently queued.

Ripple effect from step 1's `PersonIssueType` narrowing, found via grep: `frontend/src/utils/safetyIssues.ts` and `WorkerDashboard.tsx` both had `unsafe_practice` entries in client-side display-label lookup maps — removed from both (dead keys otherwise, the type no longer produces that value).

Verified live against the running backend: `GET /openapi.json` confirms `POST /issues` exists and `POST /site-issues`/`POST /person-issues` are gone; a real multipart submission (no ai_engine classifier deployed yet, by design) correctly returned `null` and left exactly one `RawIssueReport` at `status: "failed"` with the photo on disk in `uploads/pending/`, confirmed via direct Mongo query and `ls`; the success path was exercised by monkeypatching `ai_engine_client.classify_issue` in-process (no real classifier exists yet) — confirmed a real `SiteIssue` was created with `source_id`/`photo_url` populated, the photo moved into `uploads/site_issues/`, and the `RawIssueReport` count returned to its pre-test value (inserted then deleted, net zero); worker's `GET /site-issues` unchanged (mine-wide, 3 ECL issues); worker's `GET /person-issues` now correctly empty (source_id-scoped, no matches); admin's `GET /site-issues`/`GET /person-issues` went from 403 to 200 with global data. `tsc --noEmit` and `vite build` both clean.

**Follow-up, DONE (2026-09-07)** — two issues surfaced from actually looking at `WorkerReportPage` running in the browser (a live screenshot, not just reading the code), both fixed:
- **Stale subtitle.** `SectionHeader`'s subtitle still read "Fill in the details or use voice recording" — wrong even before this phase (voice recording was always `ObservationForm`/Inspections, a different component, never this one), and definitively wrong now that Inspections' voice capture was confirmed dropped, not migrated (Phase 4). Changed to "Describe the problem — our AI will classify the type and severity," which actually matches current behavior.
- **Redundant two-field split.** The form had both a required "What is the problem?" input (`reportTitle`) and an optional "Description / Notes" textarea (`reportDesc`), concatenated into one string (`` `${reportTitle}: ${reportDesc}` ``) right before submission. Neither was ever used separately anywhere downstream — `RawIssueReport`/`SiteIssue`/`PersonIssue` all have exactly one `observation: str` field, and the classifier only ever sees the merged string. Consolidated to a single required `reportDescription` textarea; the "Description / Notes" field and the concatenation logic are gone entirely.

Verified: `tsc --noEmit` and `vite build` both clean after the consolidation.

---

### Phase 3 — Failure-mode hardening for the Phase 2 pipeline

**Goal**: a failure anywhere in the Phase 2 pipeline leaves a clean, retryable state — never an orphaned file, a dangling reference, or a wrongly-typed issue in the DB.

1. `ai_engine_client.classify_issue` (or its caller in `raw_issue_report_service.py`) — strictly validate the response: `target` must be exactly `"site_issue"` or `"person_issue"`; `issue_type`/`severity` must exactly match their respective model's literal vocab. Anything else forces `issue_type = "other"` (keeping whichever `target` was given) rather than being written through as-is; if `target` itself is unparseable, treat the whole call as failed (there's no collection to write to without it). Same defensive-parsing spirit as `rag_engine.check_compliance` (`rag_engine.py:229`).
2. `raw_issue_report_service.py` — enforce strict step ordering, each step only proceeding once the previous fully succeeds: photo write → `RawIssueReport` insert → classifier call → final doc create → photo move → `RawIssueReport` delete. An exception at any step leaves the still-intact `RawIssueReport` (and its photo, if saved) as the retryable state — no step is allowed to partially apply.
3. `RawIssueReport.updated_at` — refreshed on every state transition, so a record's staleness is queryable later (the automatic sweep/retry itself is deferred — see Possible Future Issues in `feature-audit-6-sep.md` Section 3).

**Checkpoint**: forcing the ai_engine call to fail (e.g. stop the ai_engine container) during a submission leaves exactly one `RawIssueReport` at `status: "failed"`, zero orphaned files in `uploads/pending/`, and zero partial writes to `site_issues`/`person_issues`; a deliberately malformed classifier response never produces an out-of-vocab `issue_type`/`severity` in either collection.

**DONE (2026-09-07)** — implemented together with Phase 2's `raw_issue_report_service.py`, not as a separate retrofit pass — writing the pipeline once with the ordering discipline and validation built in from the start, rather than writing it naively and correcting it afterward. All three items landed exactly as scoped: strict `target`/`issue_type`/`severity` validation with fallback (step 1), the photo→raw-record→classify→final-doc→move→delete ordering with no step starting before the last one committed (step 2), `updated_at` refreshed on every state transition (step 3). Verified live via the same tests as Phase 2's DONE note — the failure path left no orphaned file and no partial write (the photo stayed in `uploads/pending/`, nothing was written to `site_issues`), and the success path's `RawIssueReport` count returned to net zero (inserted, then deleted) rather than leaking a stale row.

---

### Phase 4 — Remove Inspections; migrate its capture mechanism into the Phase 2 flow

**Goal**: the dead-end `inspections` collection and its dependents are gone; the one thing worth keeping from it — real photo/voice capture plus a genuine IndexedDB offline queue — now feeds the new `POST /issues` endpoint instead.

**Depends on**: Phase 2 (`POST /issues` must exist before anything can be pointed at it).

**Backend:**
1. Delete `backend/src/models/inspection.py`, `backend/src/services/inspection_service.py`, `backend/src/schemas/inspections.py`, `backend/src/routes/inspections.py`.
2. `backend/src/models/__init__.py` — remove `Inspection` from the import and `ALL_MODELS`.
3. `backend/src/main.py` — remove the `inspections_router` import and its `app.include_router(...)`.

**Frontend:**
4. `frontend/src/utils/db.ts` — replace the `Observation` schema/store with the new payload shape: drop `pillar` (no mapping onto `SiteIssueType`/`PersonIssueType`), drop `lat`/`lng` (neither Issue model has a coordinate field — location is `level`/`section`), change `photo_urls: string[]` to a single `photo_url`, add `level`/`section`. Bump the `openDB` schema version.
5. `frontend/src/hooks/useSyncManager.ts` — change the sync POST target from `/inspections/observations` to `/issues`, update the payload mapping to match the new shape.
6. Migrate `ObservationForm.tsx`'s capture logic (photo picker, offline-queue submit) into `WorkerDashboard.tsx`'s report form, on top of the real file-input wiring already done in Phase 2 step 12.
7. Drop voice-note recording UI/logic entirely — not migrated (no consumer ever existed for it, confirmed in `feature-audit-6-sep.md` Section 3e; neither Issue model has a voice field).
8. Delete `frontend/src/pages/worker/ObservationForm.tsx` and `frontend/src/pages/worker/WorkerApp.tsx`.
9. `frontend/src/routes/AppRoutes.tsx` — remove the `/worker` route and its `WorkerApp` import.
10. `frontend/src/hooks/useGeolocation.ts` — left in place, not deleted, even though this removes its only caller (cheap to keep for a possible future surface-level feature).

**Checkpoint**: zero references to `inspection`/`Inspection`/`ObservationForm`/`WorkerApp` anywhere in backend or frontend source; a photo/description captured offline on `WorkerDashboard`'s report form syncs automatically once connectivity returns and lands as a real `SiteIssue`/`PersonIssue` once the classifier resolves it.

**DONE (2026-09-07)** — executed exactly as scoped. Backend deletions confirmed clean via full grep sweep of `backend/src`/`backend/scripts` — zero hits for `inspection`/`Inspection`. `db.ts`'s IndexedDB rewrite went further than a schema swap: bumped to version 2 and added an explicit `upgrade()` migration step deleting the old v1 `observations` store on any existing user's browser (not just defining the new `issue_reports` store and leaving the stale one behind) — needed a type-level workaround (`as unknown as 'issue_reports'`) since the old store name isn't part of the new typed schema at all. `useSyncManager.ts` now builds real `multipart/form-data` (base64 data URL → `Blob` via `fetch(dataUrl).then(r => r.blob())`) instead of a JSON POST, since `/issues` takes an `UploadFile`, not a JSON photo field.

`ObservationForm.tsx`'s capture logic was migrated into `WorkerReportPage` (`WorkerDashboard.tsx`), not copied verbatim — reused its `fileToDataUrl` pattern but for a single `File`/preview (not an array), since the new models take one photo. `useSyncManager()` is now called directly inside `WorkerReportPage` (its only remaining caller now that `WorkerApp` is gone) — the original double-instantiation warning this hook's call sites used to carry no longer applies. `pages/Dashboard.tsx`'s comment referencing `WorkerApp`'s "offline-inspection flow" was stale after this phase — updated.

Deliberately **not done**: the `inspections` MongoDB collection's existing documents were left in place, untouched — this phase removes every code reference to them (confirmed by grep), but dropping historical data from a running database is a separate, more destructive action than a code refactor and wasn't asked for.

Verified live: `tsc --noEmit` and `vite build` both clean; grep sweep of both `backend/src` and `frontend/src` (Inspections, `ObservationForm`, `WorkerApp`, the bare `/worker` route) all return zero hits outside of unrelated prose (a "regulatory inspection" marketing phrase on the landing page, an unrelated deferred-feature-name comment in `AppRoutes.tsx`) — neither refers to the removed model.

---

## 4. Regulatory Reports — seeding explicitly deferred, rest not yet planned

**Confirmed (2026-09-07)**: no seed data for this section yet, deliberately — the leftover 3 `RegulatoryReport` documents found in the DB were dropped, not replaced (see Section 3's Phase 1 above). This model's structure is expected to be rebuilt from scratch once this section gets a real planning pass; seeding it against the current structure would only be thrown away later. Nothing else in this section has been planned.

## 5. Attendance / Face Verification — Phases 1–4 DONE on the backend/frontend side (2026-09-07)

**One item deliberately not done here**: the ai_engine side of the 1-to-N face search (rewriting `POST /api/attendance/mark` in `ai_engine/src/main.py` to drop geofence/`worker_id` and do a real search against `uploads/registered_faces/`) is real ML/CV work, not glue code — it's spec'd in detail in `research/ml-engineer-handoff-7-sep.md` item 2 for the ML engineer. Until that lands, attendance-marking will 401 with "Face not recognised" for every attempt (the backend/frontend contract is correct and ready, ai_engine just isn't serving it yet). Everything else below is genuinely done and verified.

### Phase 1 — Profile Photos & Storage Migration — DONE

1. ✅ `worker_profile.py`/`officer_profile.py` gained `photo_url: Optional[str] = None`.
2. ✅ `backend/src/uploads.py` creates `uploads/registered_faces/` and `uploads/temp_selfies/` under the shared root folder (already bind-mounted for backend via `docker-compose.yml`). `.gitignore` gained `uploads/registered_faces/*`/`uploads/temp_selfies/*` exceptions (mirroring the existing `pending`/`site_issues`/`person_issues` pattern), and `.gitkeep` placeholders were added to both (had to be created via `docker exec` into the backend container — the directories are owned by root since the container creates them, so the host user couldn't write into them directly).
3. ✅ `POST /api/attendance/register-face` deleted outright from `ai_engine/src/main.py` — verified gone from `/openapi.json` after a container restart. Nothing else referenced it (confirmed via grep across `frontend/src` and `backend/src` before deleting).
4. ✅ `AdminDashboard.tsx`'s `AdminUsersPage` — added an optional face-photo file input to the "Register New User" form (shown only when the selected role is `worker`/`safety_officer`), uploaded via `PATCH /users/{id}/photo` right after account creation. Also added a photo upload/replace control to the "Manage user" panel for existing worker/officer accounts, plus a small avatar thumbnail in both the directory list and the manage panel (reads `photo_url` off `UserResponse`, resolved against the newly-exported `API_URL` from `utils/api.ts` since it's a relative `/uploads/...` path from the backend, not the frontend origin).
5. ✅ `PATCH /users/{id}/photo` in `backend/src/routes/users.py` already existed from earlier work this session (found already-written when auditing the diff) — saves to `uploads/registered_faces/{user_id}<ext>`, sets `profile.photo_url`. Kept as a separate route rather than folding into `POST /users`, since it lets a photo be added/replaced independently of account creation — the frontend calls it right after creation when a photo was selected, and again on demand from the manage panel.

### Phase 2 — Attendance Schema & Collection Cleanup — DONE

1. ✅ `AttendanceRecord.Settings.name = "attendance"`.
2. ✅ Model stripped to exactly `worker_id`, `mine_id`, `timestamp`, `selfie_saved` (found already done when auditing the diff).
3. **N/A, not a real step** — checked the dev DB directly (`coalguard`'s collection list via `mongosh`): no `attendance_records` collection exists at all, old or new. Nothing to drop.

### Phase 3 — Kiosk Flow & Backend Wiring — DONE (backend side; ai_engine side is the ML engineer's, see above)

1. ✅ `ai_engine_client.mark_attendance(files)` exists (found already written) — returns the full AI-engine response dict rather than just a `str` worker_id as originally sketched here; the route extracts `worker_id` itself, which reads slightly clearer than baking that extraction into the client function.
2. ✅ `routes/attendance.py`'s `POST /attendance/mark` no longer takes `worker_id`/geofence fields — receives frames, calls `ai_engine_client.mark_attendance`, inserts the record under whichever `worker_id` came back. Also added a `worker_name` field to the JSON response (sibling to `attendance_record`, resolved from `matched_user.full_name` — not persisted on the document itself, so the Phase-2 stripped schema stays exactly as decided) so a kiosk operator identifying someone who isn't themselves has a name to show, not just a raw ObjectId.
3. ✅ `GET /attendance/today` role-scoping found already implemented (admin unscoped, officer by `mine_id`, worker by own `worker_id`) — done via a manual `get_profile(user)` lookup rather than the shared `require_mine_assignment` dependency this doc originally suggested, which is functionally equivalent.

### Phase 4 — Frontend Kiosk Mode & Dashboard — DONE

1. ✅ New `frontend/src/components/attendance/AttendanceKiosk.tsx` (`AttendanceKioskPage`) — a continuous scan loop (wait → capture 3 frames → POST → show a result banner for ~3s → repeat) rather than a single-shot modal, run at `/dashboard/attendance/kiosk`, gated to `safety_officer`/`admin` via `RequireAuth roles={['safety_officer','admin']}` directly (not `RequireRole`, which only supports one role) since it's a shared device route, not part of either role's own tree. Linked from both `SafetyOverviewPage`'s and `AdminUsersPage`'s header actions.
2. **Found already sufficient, not rebuilt**: `WorkerOverviewPage` already showed a "Mark Attendance"/"Attendance: Verified" header badge sourced from `GET /attendance/me`, filtering for today's record — this already satisfies "the worker can see their attendance status" without needing a new historical-count widget.
3. **Found already sufficient, not rebuilt**: `SafetyOverviewPage` already showed a "Workers On-Site Today" summary card sourced from `GET /attendance/today`'s length — already satisfies "officer sees their mine's attendance for the day" at a glance; a full record-by-record table wasn't built, deliberately, since the summary card was judged enough for now (kept minimal per this project's usual scope discipline).

**Also rewrote `MarkAttendanceModal.tsx`** (the worker's own self-service "mark my attendance" button, opened from `WorkerOverviewPage`) — it still had the *old* 1-to-1 contract (sending `worker_id`, `latitude`, `longitude`, `site_lat`, `site_lon`, plus a geofence-simulation toggle UI) even though the backend it called had already moved on. It now sends only the captured frames, matching the real `POST /attendance/mark` contract, and shows the identified worker's name (falling back to the logged-in user's own name, since this flow is normally self-service) instead of a `distance_from_site_m` field the response no longer returns.

**Verified live**: `tsc --noEmit` and `vite build` both clean. `ai_engine`'s `/openapi.json` confirmed `register-face` is gone and `/api/attendance/mark` is still listed. Both `ai_engine` and `backend` containers restarted cleanly picking up all code changes (backend via its existing hot-reload; ai_engine via `docker compose up -d`, needed since its new `docker-compose.yml` volume mount for `uploads/` — added so the ML engineer's future 1-to-N search can actually read `uploads/registered_faces/` — only takes effect on container recreation, not a code hot-reload).

**Follow-up, DONE (2026-09-07)**: user tested the whole flow live end-to-end and confirmed it works. Two review fixes applied after:
- Trimmed several over-long explanatory comments (in `routes/attendance.py`, `MarkAttendanceModal.tsx`, `AttendanceKiosk.tsx`, `AppRoutes.tsx`, `AdminDashboard.tsx`, `docker-compose.yml`) down to one short line each, per general project feedback to keep comments minimal.
- Moved `AttendanceKiosk.tsx` from `components/attendance/` to `pages/AttendanceKiosk.tsx` — it's a standalone routed page shared across two roles, not a component opened from within a page, so it belongs alongside `MineMapPage.tsx` (same shape: one route, multiple roles) rather than in `components/`. `MarkAttendanceModal.tsx` stayed put — it's a real component, opened as a modal from `WorkerOverviewPage`. `AppRoutes.tsx`'s import path updated to match; `tsc --noEmit` re-verified clean after the move.

