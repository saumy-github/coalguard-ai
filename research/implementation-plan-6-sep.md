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

## 2. Mine / Levels / Map / Geolocation — no confirmed decisions yet

## 3. Person Issues / Site Issues / Inspections — no confirmed decisions yet

## 4. Regulatory Reports — no confirmed decisions yet

## 5. Attendance / Face Verification / Liveness — no confirmed decisions yet

## 6. Computer Vision / Predictive Analytics / RAG Assistant — no confirmed decisions yet
