# Frontend Modularization & Fake-Data Plan

> **Last updated:** 2026-09-06 (uncommitted — not yet pushed, exists only in this local working tree) ·
**Status:** PLAN — several structural decisions confirmed in discussion, others still open (see bottom). **The teammate branch (`origin/frontend-store-migration`) has since been merged** (commit `654fe510`) — this revision reconciles the plan against what actually landed. No decision-#8–16 work has been implemented yet; this update is scoped to correcting facts and re-opening one decision, not executing the plan.

Grounded in reading the actual current `frontend/src`/`backend/src` tree directly (file counts, grep, git history, live endpoint checks) after the merge — not the older `research/branch-audit-frontend.md`/`research/cleanup-plan.md` (2026-09-01/02), which describe a JSX/Context-API version of this app that no longer exists. Those were only cross-checked, then set aside where stale.

---

## Current structure, precisely

- `pages/Dashboard.tsx` — one `switch(user_type)` picking one of 5 role components.
- 5 role dashboards, each a monolith: `WorkerDashboard.tsx` (664 lines), `SafetyOfficerDashboard.tsx` (672), `CorporateDashboard.tsx` (489), `RegulatoryDashboard.tsx` (490), `AdminDashboard.tsx` (487, down from 555 — the merge changed it, see regression note below). Every "page" for that role (Overview, Tasks, Report, Notifications, Profile, ...) is a `render___()` function living inside the *same file*, chosen by a `switch(activeSubTab)` at the bottom. `activeSubTab` is one shared string in `uiStore` (Zustand) — not a URL route. The Mine Map (`/dashboard/map`) is the only page in the entire app that's a real route instead of a tab.
- Shared shell (`Header`, `Sidebar`, `NotificationsDrawer`, `GlobalSearchModal`, `ToastContainer`, `common/*`) — genuinely reusable, role-agnostic, in decent shape.
- `data/mockData.ts` (608 lines, up from 529 — the merge added more) → wrapped by `store/dashboardDataStore.ts` (182 lines) → imported by all 5 dashboards **and** the shared shell itself (`Sidebar`'s notification badge, `Header`, `NotificationsDrawer`, `GlobalSearchModal`). **Real API calls now exist only in `WorkerDashboard.tsx`** (2 — the `07`-plan `/site-issues` wiring). `AdminDashboard.tsx`, `SafetyOfficerDashboard`, `CorporateDashboard`, `RegulatoryDashboard` make **zero** real API calls — Admin used to be real (`GET`/`POST /users`) before the merge; see the regression note below.

### A regression the merge introduced, not something this plan asked for

**`AdminDashboard.tsx`'s real `/users` wiring is gone.** Confirmed by reading the current file: `usersList` is now a hardcoded 4-entry `useState` array, `handleAddUser` only pushes into that local array (no `api.post`), and the role `<select>` defaults to `'field_worker'` — a role name the backend has never recognized (real values are `worker`/`mine_safety_officer`/`corporate_management`/`regulatory_authority`/`admin`). This matches exactly what Codex's audit flagged before the merge landed ("It changes Admin from the current real `/users` API back to an in-memory mock user list... uses invalid backend role names"). Nobody asked for this regression — it needs to be reverted (restore the real `GET`/`POST /users` calls, fix the role dropdown to use real `UserType` values) as part of whatever phase touches Admin, independent of the rest of this plan's decisions.
- No `context/` folder exists anywhere in current `frontend/src` — confirmed by direct search. It was a leftover reference to the old, now fully-replaced JSX app (`AppContext.jsx`), already superseded by the `store/` Zustand stores.

### What the merge actually added (verified against live code, not the merge message)

- **`frontend/src/lib/` is gone — renamed to `frontend/src/utils/`.** Decision #5 executed: the folder was renamed (14 importing files updated) *and* the `.gitignore`'s original bare `lib/` line (standard Python-boilerplate rule, unrelated to this frontend folder) was restored afterward — the rename removes the collision, the restored rule is back to doing what it was always meant to do (ignore Python packaging output elsewhere), not a partial/either-or fix as originally scoped.
- **Real guest login now exists end-to-end.** `POST /auth/guest` (backend, `auth/guest.py` + `seed_guests.py`, one seeded guest `User` per role) is wired to a real `loginAsGuest` in `authStore.ts`, and `LandingPage.tsx` was completely reworked around it — the old hardcoded 6-role-card array (with stale `field_worker`/`system_admin` keys) is gone, replaced by `ROLES`/`DASHBOARD_PATH_BY_ROLE` (`utils/userTypes.ts`, single source of truth for the 5 real roles) driving actual "Continue as Guest" buttons. This is a genuine new real surface, not mock — update Part 1's table below.
- **A new `Inspection` model + `POST /inspections/observations` endpoint now exist** (`backend/src/models/inspection.py`, `services/inspection_service.py`, `routes/inspections.py`), backing the `/worker` route's offline observation queue. **This directly conflicts with Decision #12's target design**: `inspection_service.create_manual_observation` falls back to `org_service.ensure_placeholder_org()` (`user.mine_id` or a shared "Test Subsidiary"/"Test Mine" placeholder) — exactly the `User.mine_id`/`subsidiary_id` pattern Decision #12 replaces with `mine_assignments`. **Agreed handling**: leave `Inspection` as-is for now; it gets revisited/migrated when Decision #12's authorization migration actually happens, not before. Don't build anything further on top of the current `Inspection` shape in the meantime.
- **`Sidebar.tsx` picked up a cleaner `NAV_ITEMS_BY_ROLE` record** (one static table keyed by `UserType`, replacing the old `if/else` chain) — a small step toward Decision #2/#7, but still tab-based (`activeSubTab`), not routes. Decisions #2 and #7 remain entirely unimplemented — `App.tsx` still defines routes inline, and only `/dashboard/map` is a real route; everything else is still a tab.
- **`/worker` is untouched (Decision #1 not executed) — see re-opened note below.**

---

## Decisions confirmed in discussion

### 1. Delete `/worker` entirely — **RESOLVED: reversed — `/worker` stays**

Originally: `WorkerApp.tsx` + `ObservationForm.tsx` (route-based, under `/worker`) get removed, along with the tab-based `WorkerDashboard.tsx` under `/dashboard` being the one true Worker surface going forward.

**Provenance, traced via git history** (not the stale docs): the real logic here — `useGeolocation.ts`, `useSyncManager.ts`, the observation form, offline IndexedDB queue — was authored by **Akshat Kashyap**, originally in commit `7ca612f8` ("feat: extract mobile PWA into separate frontend/mobile app", 2026-09-01), under `frontend/mobile/src/pages/inspector/`, relocated to `frontend/src/pages/worker/` via merge commit `2267a7b8` (`saumy-github`, 2026-09-02). **Since then it was substantially reworked again** on `origin/frontend-store-migration` (commit `f3ab0627`, "Add inspections endpoint; fix offline-sync auth, 404, hang, and role-gate bugs") and merged in via `654fe510` — the offline queue now has fixed auth headers, no more 404/hang bugs, a real backend `Inspection` model to submit to (`POST /inspections/observations`), and the route itself is properly role-gated (`RequireAuth roles={['worker']}`).

**Why this reversed**: the case for deleting this got weaker, not stronger, since it was first decided — the code is now real working functionality (verified live: an unauthenticated/wrong-role request is correctly redirected, `idb`-backed offline queue installed and type-checks clean), not the rough state it was in originally. Deleting it would throw away more real, working code than before. **Final: `/worker` stays.** It still needs migrating onto Decision #12's `role`/`mine_assignments` model like everything else (see `org_service.py`/`Inspection` note above) — that happens as part of Phase 1, not as a separate decision anymore.

### 2. Real per-page routes, RBAC-gated, replacing tab-switching

Every current tab becomes an actual `<Route>`, guarded by role. This also fixes a real gap that exists today: current "RBAC" in the frontend is only *which links appear in the sidebar* — nothing stops a logged-in user from reaching any tab, since `activeSubTab` isn't actually guarded; only the backend enforces real access (via 403s, after the fact). A route guard component (matching the existing `components/auth/RequireAuth.tsx` naming — e.g. `RequireRole`) gives the frontend a real enforcement point for the first time.

This supersedes Part 2 below's original "extract into files, still switched by `activeSubTab`" framing — pages become routes, not just separate files under the same switch.

### 3. Remove `data/` (mockData.ts), backend supplies everything, page structure stays

Your framing: *"all the data which needs to be placed will come from the backend, we will only follow the structure of the page made so far."* Read precisely: the visual/structural design of each page (layout, `PageLayout`/`SectionHeader` usage, form fields, etc.) is kept as-is — only the data source changes, from `mockData.ts`/`dashboardDataStore` to real backend calls. This happens **page-by-page as backend endpoints exist for it**, not as one deletion — the existing Part 3 table below (which mock export maps to which real backend status) still holds and becomes the tracking mechanism for this.

### 4. `store/` folder — kept as `store/`, `context/` — nothing to do

`store/` stays (it's the standard name in the Zustand ecosystem specifically; the reference structure the user shared has no equivalent — it uses `context/` instead, which doesn't apply here since Zustand is `lld.md` §2's chosen state library). Its 3 files:
- `authStore.ts` — real, unaffected by any of this. Token + current user, persisted.
- `uiStore.ts` — `activeSubTab` becomes dead code once real routes land (decision #2) and should be deleted at that point; `isSidebarOpen`/toasts remain legitimate shared UI state regardless of routing model.
- `dashboardDataStore.ts` — removed alongside `data/` (decision #3), page-by-page as each page's data source moves to the real backend.

`context/` — confirmed not to exist in the current codebase at all; no action needed.

### 5. `lib/` → `utils/` — **DONE**

**The bug**: the root `.gitignore` line 17 was a bare `lib/` (standard Python boilerplate, meant for Python packaging output like `build/lib/`). A pattern with no leading slash matches a directory of that name *anywhere in the repo* — confirmed with `git check-ignore -v`, which showed it matching `frontend/src/lib/api.ts`, `db.ts`, and `userDisplay.ts`. `git ls-files` confirmed none of the three were tracked. **`api.ts` — the axios client with the auth-token interceptor every store and API call depends on — had never been pushed to any remote branch.**

**Executed**: `frontend/src/lib/` renamed to `frontend/src/utils/` (`git mv`, preserving history), all 14 importing files updated (`../lib/...` → `../utils/...`), and the `.gitignore`'s original `lib/`/`lib64/` lines restored afterward — since the folder no longer has that name, the rule is back to doing what it was always meant to do (Python packaging elsewhere) with no collision. `frontend/src/utils/` now also holds `userTypes.ts` (new, from the merge — `UserType`/`ROLES`/`DASHBOARD_PATH_BY_ROLE`, single source of truth for the 5 roles).

### 6. Zustand stays — routing and state-library choice are independent decisions

Per the breakdown above: routing only replaces `activeSubTab`. `authStore` is untouched by a routing change (auth has nothing to do with URL structure), and `dashboardDataStore`'s removal is a data-fetching-source change, not a routing change. No technical reason to drop Zustand just because pages become routes.

### 7. Dedicated `routes/` folder, not inline in `App.tsx`

Matches the reference structure (image 5). Route definitions (paths, which page component, which role guard) move out of `App.tsx` into their own `routes/` folder — exact shape (one file per role, one big route table, etc.) to be worked out when Part 2's per-role route migration actually starts, but the folder-level decision is made now: a real `routes/` directory exists, `App.tsx` stops being where routes are defined inline.

### 8. Remove unsupported global chrome for now; add it back only with backend support

Remove the notification badge/drawer, global-search entry point/modal, and dashboard footer. They are currently backed by `NOTIFICATIONS_DATA` and mock-store search data (or are purely decorative), not a real product capability. Document them as deferred UI: notifications return once a backend notification/push system exists; global search returns once there are real, searchable backend resources; a footer can return later if product content requires one.

The shared-header Wi-Fi button is also not a real connectivity indicator: it only toggles `uiStore.isOfflineMode` and labels itself “Offline mode (simulated)”. The only actual sync action is in the separate `/worker` page, which this plan already removes. Do not present the header button as working connectivity/offline sync. Its eventual replacement must use real network status and the chosen inspection/offline-sync flow.

### 9. Worker overview: retain only the real report flow and future-facing essentials

Remove the Worker overview's mock/unsupported content for now:

- `Safety Status`: remove. A real issue should instead produce a warning on the main Worker screen when a backend safety event exists; do not build that alert now.
- `Pending Reports`: remove. It is a hard-coded `0`, not a functioning report-status query.
- `Quick Actions`: remove. Its Start Inspection, Upload Photo, and Share Location affordances do not have the required product flows/backend support.
- `My Tasks` summary and `My Tasks for This Shift`: remove for now. Shift tasks will be reintroduced later with a real task/inspection backend.
- Environment-status information: do not show it to workers.

`Today's Shift` is also deferred: reintroduce it together with an attendance tracker and a real shift/attendance backend. The existing "Shift A, 06:00–14:00" value is mock data.

Keep the Worker profile, but make it an honest profile view sourced from `GET /auth/me`. That endpoint already provides ID, full name, email, phone, role, `mine_id`, and guest status. The current profile's employee ID, badge number, mine *name*, shift timing, organization, emergency contacts, equipment/PPE verification, and certifications are not supplied by the backend, so they must be removed or shown as unavailable until their data model and API exist. A separate editable-profile endpoint is also not present today; this first version is read-only.

The one Worker overview feature to add now is a personal-issue warning area: show only open `PersonIssue` records assigned to the logged-in worker, such as `no_helmet`, `no_vest`, or `unsafe_practice`, with severity, observation, location, and the required corrective action. This replaces the generic safety-status card and appears only when an actual issue exists. The model and detection flow already exist, but `GET /person-issues` currently returns all issues for the mine even to a Worker. Add a backend `GET /person-issues/me` (or make the Worker role's existing list server-filter by `worker_id == current_user.id`) before adding this UI; client-side filtering alone would expose other workers' information. Camera-detected issues whose `worker_id` is null must not appear as a personal warning until identity assignment exists.

### 10. Safety Officer: build a real issue-command surface; defer unsupported operational tooling

**Build now:** Overview, a combined **Safety Issues** queue, Mine Map, and read-only Profile.

The Safety Issues queue is the first real Safety Officer page. It combines the already-available mine-scoped `SiteIssue` and `PersonIssue` records into one chronological, severity-first queue. It shows real gas/ventilation/equipment issues and personal/PPE violations (`no_helmet`, `no_vest`, `unsafe_practice`), including severity, location, observation, source, timestamp, and the site issue's recommended action where present. The officer is allowed to view all issues in their mine; this differs deliberately from the Worker’s personal-only issue view.

The Overview reuses that same issue data rather than introducing another data source: show a critical warning only where a real high/critical issue exists, counts for open site-safety issues and worker/PPE violations, and a small list of recent unresolved items linking to the full queue. Do not retain a fabricated "Normal" safety state, ticket count, open-actions count, or compliance score.

Mine Map remains the existing real map/issue surface. Profile is a read-only `GET /auth/me` view; use only fields the endpoint actually returns, as specified for the Worker profile above.

**Defer for future backend work:**

- AI Assistant: the RAG capability exists in `ai_engine`, but do not wire it now. It requires a backend endpoint/proxy and a defined response contract.
- Live Monitoring and sensor calibration: no telemetry/WebSocket system exists; the current readings and calibration are simulated.
- Incident assignment, corrective actions, and marking an issue resolved: the present mock ticket controls have no equivalent workflow/API. The queue is read-only until that workflow is designed.
- Inspections: no inspection data model or API exists.
- Reports & History: current audit/blockchain history is mock data; the ledger is deferred.

### 11. Corporate Management scope: assign mines directly; no subsidiary layer for now

Remove the `Subsidiary` concept from the near-term product model. Corporate Management users manage multiple mines directly. Do **not** put a `corporate_manager_id` on `Mine` or a duplicated `managed_mine_ids` array on `User`; either shape becomes restrictive when a mine changes manager, needs a temporary manager, or has more than one corporate manager. Use the role-and-scope assignment model in Decision #12 instead.

```
Corporate Management user
  ├── mine_assignment → Mine A
  ├── mine_assignment → Mine B
  └── mine_assignment → Mine C
```

Corporate dashboard/API queries must return only mines that have an active Corporate Management assignment for the current user, plus issues belonging to those mines. A user with no assigned mines gets an empty state, never access to all mines.

Until this direct mine-assignment model and corporate-scoped endpoints exist, Corporate Management has only a read-only basic Profile (`GET /auth/me`). Its current overview, mine directory/map, risks, compliance, AI insights, and reports remain mock/deferred. The first real Corporate feature after the model/API work is a cross-mine safety-issue overview and queue for that manager's assigned mines; production, compliance, ESG, forecasting, and report features require separate data models and remain later work.

### 12. Replace the single `User`-collection authorization design with a single role and mine scope

#### Why the current design does not scale

The current backend places identity, role, and scope together in `User`: `user_type` determines the user's job function, while `mine_id` and `subsidiary_id` attempt to determine what the user can access. The frontend also carries a growing set of optional role-shaped fields (`badgeNumber`, `department`, `employeeId`, `mineAssigned`, `shift`, and similar display data). This produces two problems:

1. A single User document accumulates fields irrelevant to most people—worker equipment/shift information, officer certification information, corporate department information, and so on.
2. A role by itself cannot safely determine access. Two safety officers can have the same role but be authorized for different mines; a corporate manager can oversee multiple mines. Endpoint code must therefore check both **what the person may do** and **where they may do it**.

The answer is not frontend-only RBAC or more optional fields. It is a small, explicit authorization model used by all protected backend endpoints.

#### Target collections and responsibilities

```
users                         # identity, authentication, and exactly one role
  id
  full_name
  email / phone
  password_hash / google_id
  role: worker | safety_officer | corporate_manager | regulator | admin
  active
  is_guest

mine_assignments              # where a user's role applies
  user_id
  mine_id
  active
  assigned_at
  revoked_at (optional)
```

Every user has exactly one active role. A user must never hold multiple roles or inherit powers from several dashboards. The role is a required, single enum on `users`, not a list and not a `user_role_assignments` collection. If a person's job changes, an Admin performs an audited role change and updates/revokes their mine assignments as needed; the old and new powers never coexist.

The necessary rule is: **a user may perform an action only when their one role permits it and they have an active assignment at the target mine's scope.**

For example:

```
Ravi (Corporate Management)
  → Mine A  [corporate_manager]
  → Mine B  [corporate_manager]
  → Mine C  [corporate_manager]

Neha (Safety Officer)
  → Mine A  [safety_officer]

Amit (Worker)
  → Mine A  [worker]
```

This removes `subsidiary_id` from the near-term access model. It also avoids keeping a mutable mine-ID list in a user document or a single `corporate_manager_id` on Mine. An assignment record is auditable and supports reassignment, multiple managers where later needed, and temporary access without changing the core identity data.

#### Role-specific data belongs in profile collections, not `users`

Only create a profile collection when the product has real data and a real workflow for it. Examples for later—not fields to add speculatively now—are:

```
worker_profiles
  user_id, employee_id, badge_number, emergency_contact, ...

safety_officer_profiles
  user_id, certification_number, jurisdiction, ...

corporate_profiles
  user_id, designation, department, ...
```

This keeps `users` compact, lets profile data evolve independently, and prevents unrelated null/optional fields from accumulating. The current basic read-only profile pages should use only the real `GET /auth/me` identity fields until a corresponding profile model and endpoint actually exist.

#### Authorization behavior by user type

| User type | Role check | Scope check |
|---|---|---|
| Worker | Worker role | Must have a Worker assignment for the issue/mine; personal warnings must additionally match `PersonIssue.worker_id == current_user.id`. |
| Safety Officer | Safety Officer role | Must have a Safety Officer assignment for the mine; may view that mine's site and person issues. |
| Corporate Management | Corporate Manager role | May view only mines with an active Corporate Management assignment and their issue aggregates/queues. |
| Regulatory Authority | Regulator role | Resolved in Decision #13 — see that decision's "Regulator scope" note. Simplified for now (one Regulatory Authority assumed): every mine with an active Corporate Management assignment. Not a stored assignment on the regulator's own account. |
| Admin | Admin role | Global administrative scope, limited to genuine administration endpoints such as user/role/assignment management. |

Frontend guards and sidebar links remain useful for navigation, but they are never the security boundary. Every data endpoint must apply the role-and-scope check server-side before returning or mutating records.

#### Backend changes required

This is a cross-cutting authorization migration, but not a rewrite of every business feature. The backend work is:

1. Add the role and mine-assignment models/collections, service functions, and migrations/seed data.
2. Replace the `User.user_type`, `User.mine_id`, and `User.subsidiary_id` access decisions with reusable authorization helpers such as `require_role(...)`, `require_mine_assignment(...)`, and `accessible_mine_ids(...)`.
3. Update `GET /auth/me` to return the current user's one role and active mine assignments. There is no role-switching UX.
4. Update Admin user management so creating or editing a user manages the single role and mine-assignment records; do not expose raw access fields as arbitrary frontend form inputs.
5. Update existing protected routes—currently site issues, person issues, mine levels, and user administration—to use the new helpers. A worker's personal-issues query must be server-filtered; a safety officer's query must be restricted to assigned mines.
6. Add Corporate Management endpoints only after the scope helpers exist. They query issues where `issue.mine_id` is in the current user's accessible corporate mine IDs; they never accept unrestricted mine IDs from the client.
7. Add authorization tests for allowed and denied cases for every role/mine combination, including a user assigned to no mine and cross-mine attempts.

The backend has few protected routes today, which is exactly why this should happen now: it establishes one consistent rule before more routes depend on the old fields.

#### Frontend changes required

The frontend must consume the new auth response for navigation and display, but must not be trusted to enforce access. Required updates are:

- Replace the single `user_type` assumption in `authStore` with one role plus mine-assignment-aware current-user data.
- `RequireRole` checks whether the authenticated user holds the role required by a route; optional route scope checks prevent displaying a page for an inaccessible mine.
- Sidebar items are derived from the user's one actual role, not from mock dashboard data.
- Worker, Safety Officer, and Corporate pages request only their server-scoped endpoints; the UI does not filter a broad response client-side to simulate authorization.
- Basic profile pages keep showing real identity data only. Role-specific fields appear only when their future profile APIs exist.

#### Safe rollout sequence

1. Introduce new role and assignment collections plus seed/migration code, while temporarily retaining existing User fields for compatibility.
2. Implement and test the common authorization helpers.
3. Migrate `/auth/me` and Admin user-management flows to read/write the new model.
4. Migrate the currently live issue and map routes one by one, verifying both authorized and cross-mine-denied behavior.
5. Add the Worker personal-issue endpoint, Safety Officer issue queue, and then Corporate cross-mine issue endpoints on the new model.
6. Change frontend routing/store code to the new response shape.
7. Remove deprecated `user_type`, `mine_id`, and `subsidiary_id` fields only after all callers and existing user records have migrated.

This follows the common RBAC pattern of separating a principal (user), a role (permissions), and a scope (which resource set those permissions apply to). This product intentionally restricts each principal to one role; the scope should be as narrow as the work requires, normally a mine. See [NIST's RBAC definition](https://csrc.nist.gov/glossary/term/role_based_access_control) and [Microsoft's explanation of role assignments and scope](https://learn.microsoft.com/en-us/azure/role-based-access-control/overview).

### 13. Regulatory Authority: corporate-report oversight, independent verification, and a tamper-evident audit chain

Regulatory Authority is not a live mine-control surface and must not expose worker identities, individual PPE detections, exact incident locations, or minute-by-minute operational telemetry. It is a two-party oversight workflow:

```
Corporate Management submits a mine report
  → Regulatory Authority reviews and may verify it
  → Regulatory Authority may submit an independent verification report or finding
  → either party may submit follow-up reports/evidence
  → Regulatory Authority records the final verification/closure decision
```

There may be multiple reports from both parties for a single mine and reporting period, especially where an issue is found. New reports must be immutable additions or explicit revisions linked to prior reports—never an overwrite of history.

#### Regulatory pages and permitted data

| Page | Purpose and data boundary |
|---|---|
| Overview | Aggregate KPIs across the regulator's assigned mines: mines reporting, reports awaiting review, total reported issues, critical-issue count, reported average resolution time, overdue actions, and compliance state. No raw incident feed. |
| Mines | An aggregate map with one marker per assigned mine and a high-level status/KPI summary. It does not expose individual issue location, worker identity, or exact incident timing. Map support requires real mine location/geometry fields, which do not exist yet. |
| Compliance | Corporate periodic compliance reports and the regulator's review/verification status. |
| Inspections | Regulator-authored statutory inspection reports. Deferred until the inspection data model and workflow exist. |
| Actions Required | Formal regulatory notices/actions, their due dates, corporate evidence/follow-up submissions, and regulator verification or rejection. Deferred until that workflow exists. |
| Audit History | Chronological, tamper-evident events for report submission, revision, verification, notice issuance, evidence submission, and closure decisions. |
| Reports | Both parties' reports and generated summaries, retaining every version and relationship. |
| Profile | Basic read-only identity data from `/auth/me`; role-specific fields wait for a real profile API. |

The corporate report is a mine-level, period-based aggregate, for example:

```
Mine: Test Mine
Reporting period: September 2026
Total safety issues: 18
Critical issues: 2
Resolved issues: 15
Average resolution time: 7.4 hours
Open actions: 3
Overdue actions: 1
Compliance declaration: submitted
Attachments: supporting report/evidence
```

The regulator sees this submitted aggregate, not a list such as "no helmet at location X at time Y". It may compare corporate declarations with its inspection/finding reports, and request evidence or issue a formal action when they disagree.

#### Report, verification, and action model

Use explicit records rather than a single mutable `report` field:

```
regulatory_reports
  id
  mine_id
  reporting_period
  report_type: corporate_submission | regulatory_verification |
  status: submitted | under_review | verified | disputed | superseded
  parent_report_id (optional; a revision/follow-up is linked, not overwritten)
  submitted_by_user_id
  submitted_at
  aggregate_metrics
  declaration / findings
  attachment references

regulatory_actions
  id
  mine_id
  originating_report_id
  issued_by_user_id
  title, required_action, due_at
  status: open | evidence_submitted | verified | rejected | overdue

regulatory_action_evidence
  id
  action_id
  submitted_by_user_id
  submitted_at
  description
  attachment references
```

A Corporate user may create a `corporate_submission` only for an assigned mine. A mine newly created by that Corporate user may appear in its Corporate report; the Regulatory Authority receives only the aggregate submitted report once the mine has an explicit regulator assignment. A Regulatory user may create a `regulatory_verification`, issue an action, and verify/reject evidence only for a mine in their regulator assignment scope. Corporate users may submit follow-ups/evidence but may never set an action to verified. These checks are enforced through Decision #12's role-and-mine-assignment helpers.

`average_resolution_time` is not currently calculable from the existing issue model: it has no genuine resolution workflow, `resolved_at`, verifier, or evidence. Until that workflow exists, it is a corporate-declared aggregate value and must be labelled accordingly. Once corrective actions are implemented, calculate it from recorded timestamps and retain the calculation inputs.

#### Regulator scope: simplified to one Regulatory Authority for now

The real-world body this role models, India's Directorate General of Mines Safety (DGMS), is not a single national office. It is organized into 8 zones and 38 regional offices, each region under its own Director of Mines Safety, with jurisdiction over whichever mines sit in that region regardless of which company operates them (DGMS notification raising regional offices from 29 to 38; DGMS's own published zone/region jurisdiction list). So multiple regulator accounts, each scoped to a different, geography-defined set of mines — not tied to any one corporate operator — is the realistic long-term model.

Building that properly needs a real regulator-to-mine (or regulator-to-corporate) assignment relationship, plus a way to manage it — more than this phase needs, and more than the current demo data can meaningfully exercise. For now, this platform assumes **exactly one Regulatory Authority account exists**. Under that assumption, "which mines does the regulator see" has a trivial answer that needs no new collection at all: every mine with an active Corporate Management assignment, anywhere. `accessible_mine_ids` for the `regulator` role is computed this way directly — one query over `mine_assignments` filtered to `role == corporate_manager` — not a stored assignment on the regulator's own account.

This stops being correct the moment a second regulator exists: two regulators would trivially see the same "all corporate-managed mines" set, with no way to tell their jurisdictions apart. The real fix, deferred until it's actually needed, is a `regulator_assignments` collection (`regulator_user_id`, `corporate_user_id`, `active`, `assigned_at`) recording which specific corporate managers — and by extension their mines — each regulator oversees. That shape also matches Decision #14's already-planned provisioning hierarchy, where a Regulatory Authority is the one who creates Corporate Management accounts in the first place, so "oversees" and "created" naturally line up once that collection exists.

To make the regulator's aggregate pages (Overview KPIs, Mines list) actually demonstrate cross-mine aggregation rather than aggregating a single mine, seed data now includes **two** Corporate Management accounts, each managing their own mine — reusing the org names already used as flavor text on the Landing page rather than inventing new ones: the existing placeholder mine becomes ECL (Sector 7G), and a new second mine is added for BCCL (Moonidih).

#### Blockchain / tamper-evident ledger: the correct role

Blockchain is not the operational database. Do not write raw sensor readings, live issue updates, worker personal data, photos, full PDFs, or every UI event to a blockchain/ledger. Those remain in ordinary database and file/object storage.

Use the ledger to make regulatory milestones tamper-evident:

- Corporate report submitted, revised, or superseded
- Regulatory inspection finalized
- Regulatory verification or finding submitted
- Formal action/notice issued
- Corporate corrective-action evidence submitted
- Regulator verifies or rejects closure

For every such event, store the document/data normally, calculate a content hash of its finalized version, then append an audit-ledger record with the hash, record ID, mine ID, event type, actor, timestamp, and prior ledger hash:

```
report/document in database or object storage
  → SHA-256 content hash
  → append-only audit ledger event containing that hash and prior event hash
```

The chain proves that a later document matches the submitted version and makes later alteration detectable. It also preserves a history when either party submits multiple reports.

Start with an append-only database audit ledger with chained hashes. Adopt a permissioned blockchain only if Corporate and Regulatory bodies need independently operated, jointly verifiable infrastructure. A blockchain has value where participating organizations do not fully trust a single database operator; it adds cost and complexity without benefit for ordinary internal dashboard data.

#### Implementation order

1. Add regulator mine assignments and a real mine registry with location fields for aggregate-map markers.
2. Add versioned corporate/regulatory report, action, and evidence models with server-side role-and-scope checks.
3. Build Corporate report submission and Regulatory overview/compliance/report-review pages.
4. Add the append-only chained-hash audit ledger for finalized events.
5. Add regulator inspection, actions-required, evidence, and closure-verification workflows.
6. Reassess the need for a permissioned blockchain after the ledger workflow is in real use.

### 14. Admin and delegated user/mine provisioning

Admin is the platform-administration role, not an operational dashboard. Its first real capabilities are user creation/activation, single-role changes, mine assignment management, mine registry management, and a basic read-only profile. System Health, Data & Storage, AI System, generic Activity Logs, and Settings remain deferred until each has a real underlying service or configuration model (see Decision #15).

User and mine creation follows this delegated hierarchy:

```
Admin
  → may create every user type and every mine

Regulatory Authority
  → may create Corporate Management users

Corporate Management
  → may create Safety Officers
  → may create mines

Safety Officer
  → may create Workers
```

Creating a user is a controlled backend workflow, not simply inserting a User document. The provisioning endpoint must create the base identity with its one role, any permitted mine assignment, and an audit event in one operation.

| Actor | May create | Mandatory scope constraints |
|---|---|---|
| Admin | All roles, including other Admins; all mines | Global platform scope. Protect the initial/bootstrap admin and prevent removal of the last active admin. |
| Regulatory Authority | Corporate Management | Creates the corporate identity/role only. It does not automatically grant access to every mine. Mine regulatory scope is assigned explicitly when a mine is registered/accepted. |
| Corporate Management | Safety Officer; Mine | A new Safety Officer may be assigned only to mines the creating corporate user manages. When creating a mine, automatically create an active Corporate Management mine assignment for the creating user. |
| Safety Officer | Worker | A new Worker may be assigned only to a mine where the creating officer has an active Safety Officer assignment. |

No role may create a peer or a more privileged role: a Safety Officer cannot create another Safety Officer/Corporate/Regulatory/Admin; a Corporate user cannot create Corporate/Regulatory/Admin; and a Regulatory user cannot create Regulatory/Admin. The frontend may hide unavailable actions, but the backend policy is authoritative.

Mine registration needs one explicit follow-up decision: a mine created by a Corporate user is immediately in that corporate user's scope, but it must receive an explicit Regulatory Authority assignment before it is eligible for the regulatory report-and-verification workflow. This prevents silently granting a regulator access to a newly created mine. An Admin can make that assignment; a future mine-registration/acceptance flow may allow the regulator to accept it themselves.

Implement one central service, conceptually `provision_user(actor, new_user, role, assignments)` and `create_mine(actor, mine)`, rather than duplicating hierarchy checks in route handlers. Every creation, role change, assignment, revocation, activation, and mine registration produces an audit event. This is also the place to enforce input validation, prevent self-escalation, and maintain the one-role/active-assignment rules from Decision #12.

### 15. Consolidated removal and deferred-work backlog

This is the authoritative backlog of functionality deliberately removed from the current product surface or deferred because the backend/workflow does not exist. "Remove now" means remove the current mock/simulated UI and its navigation entry where applicable. "Deferred" means retain the requirement in this plan, but do not fake it in the interface.

#### Remove now

| Area | Remove from the current UI | Return only when |
|---|---|---|
| Shared shell | Notification badge/drawer, Global Search, dashboard footer | Notifications have a backend/push design; search has real, permission-scoped data; footer has genuine product content. |
| Shared header | Simulated Wi-Fi/offline-mode toggle | A real network-status and chosen offline-sync workflow exists. |
| Worker overview | Generic Safety Status, Pending Reports, Quick Actions, environment readings, task summary/list, mock shift card | See deferred Worker work below. |
| Safety Officer | Simulated telemetry readings, sensor-calibration button, simulated hazard/reset/evacuation controls, mock ticket assignment/resolution controls, mock AI answers, mock inspection list, mock audit/history list | See deferred Safety Officer work below. |
| Corporate Management | Fabricated production figures, compliance scores, ESG/EC-quota claims, forecasts, report-download toasts, mock mine directory/map | The associated real data models and APIs exist. |
| Regulatory Authority | Existing mock mine/compliance/inspection/action/audit/report content | The aggregate report-and-verification workflow in Decision #13 exists. |
| Admin | Any static/mock system-health, storage, AI-health, activity-log, or settings metrics | The associated real service/configuration data exists. |

#### Deferred Worker work

- **Attendance and shifts:** rebuild Today's Shift only with an attendance tracker and real shift/attendance records.
- **Tasks/inspections:** rebuild worker tasks and task completion only with a task/inspection/corrective-action workflow.
- **Personal issue warning:** this is planned for the first real Worker overview. It requires a safe server-filtered personal-issues query and displays only open issues assigned to that Worker.
- **Geolocation/offline queue:** the planned deletion of `/worker` removes the present implementation. Wait for the incoming changes from the teammate who worked on it, review them, then decide whether to rebuild it as part of a real New Inspection flow or drop it permanently; do not retain an isolated mock/offline screen.
- **Worker profile details:** employee/badge IDs, shift, organization, contacts, PPE, and equipment need a real worker-profile API before display/editing.

#### Deferred Safety Officer work

- **Live monitoring and calibration:** require telemetry readings, device/asset records, a WebSocket or polling contract, and an actual calibration command/audit flow.
- **AI Assistant:** require a backend RAG proxy, permission model, request/response contract, citations, and failure handling; do not call the engine directly from the browser.
- **Inspections:** require statutory inspection records, checklists, evidence, status, and ownership.
- **Corrective-action workflow:** requires assignment, actions, `resolved_at`, verifier, evidence, and reopen/reject behavior. It is a prerequisite for trustworthy resolution metrics.
- **Reports/history:** use real report/action records and the Decision #13 audit ledger, not the present fabricated blockchain history.
- **Officer profile details:** certifications, sector assignments, and related fields require a real profile API.

#### Deferred Corporate work

- **Cross-mine safety oversight:** done — Phase 6. Aggregates only mines with an active Corporate Management assignment for that user.
- **Mine directory/map:** requires a real mine registry (Decision #14/Phase 8) beyond the minimal `lat`/`lng` Phase 7 added just for the Regulatory Mines page.
- **Production, environmental, EC quota, ESG, and compliance scores:** each requires its own source-of-truth data model and calculation rules; they must not be inferred from issue records.
- **AI forecasts/insights:** require the underlying historical data, model contract, validation, and an accountable business workflow.
- **Compliance report submission:** done — Phase 7's trimmed `RegulatoryReport` loop. Generated board/ESG PDF reports still need a separate report-generation and storage design.
- **Corporate profile details:** designation and department need a real corporate-profile API.

#### Deferred Regulatory work

Resolved by Phase 7 (`10-frontend-coding-plan.md`), trimmed scope: the aggregate Mines page (minimal `Mine.lat`/`lng`, no map widget), the corporate-submission/regulator-verification report loop (versioned `RegulatoryReport`, immutable — never overwritten, only new linked reports), and a real `GET /auth/me` profile. Still genuinely deferred, per Phase 7's own "deliberately not done here" list:

- **Inspections, actions, evidence, and closure:** require the models/workflow set out in Decision #13, not built in Phase 7's trimmed pass.
- **Average resolution time:** label as corporate-declared until a real corrective-action system records resolution timestamps and verification.
- **Tamper-evident audit ledger:** the chained-hash append-only ledger itself, ordered after the report/action models per Decision #13's implementation order. Consider a permissioned blockchain only after a genuine multi-party trust requirement is established.
- **Multi-regulator jurisdiction scope:** Phase 7 assumes exactly one Regulatory Authority account exists (Decision #13's "Regulator scope" note) — a regulator's mines are computed as "every mine with an active Corporate Management assignment," not a stored assignment of its own. A `regulator_assignments` collection (regulator↔corporate manager) is required once a second regulator exists.

#### Deferred Admin work

- **System Health:** backend/frontend service, database, queue, and integration health endpoints with authorized operational metrics.
- **Data & Storage:** real storage usage, retention, backups, and deletion policies.
- **AI System:** service health, model/version metadata, usage, and governance metrics.
- **Activity Logs:** a real filtered administrative audit-log view built from the provisioning, assignment, report, and action events—not decorative logs.
- **Settings:** only real, permission-controlled platform configuration; do not expose a generic settings form without defined setting ownership and validation.

### 16. Dashboard URL structure: one authenticated entry point, separate role-specific route trees

Do not use one `/dashboard` URL and conditionally render every role's entire interface beneath it. That shape makes browser refreshes, bookmarks, deep links, analytics, tests, and route-level guards unclear. It also leaves the URL unable to explain what page the user is viewing.

Use one shared authenticated landing route instead:

```
/dashboard
  → after authentication, redirect according to the user's one role
```

Each role then has its own route tree beneath the same dashboard shell:

```
/dashboard/worker
/dashboard/worker/report
/dashboard/worker/map
/dashboard/worker/profile

/dashboard/safety
/dashboard/safety/issues
/dashboard/safety/map
/dashboard/safety/profile

/dashboard/corporate
/dashboard/corporate/profile

/dashboard/regulatory
/dashboard/regulatory/mines
/dashboard/regulatory/compliance
/dashboard/regulatory/reports
/dashboard/regulatory/profile

/dashboard/admin/users
/dashboard/admin/mines
/dashboard/admin/access
/dashboard/admin/profile
```

Deferred pages are added only when their real backend workflow exists—for example, Safety inspections, Corporate reports, and Regulatory actions/inspections. Do not create navigable placeholder URLs just because a mock tab exists today.

`/dashboard/admin` remains under `/dashboard` for now because all roles use the same authenticated application shell. If Admin later becomes a truly separate application with its own layout, deployment, and operational experience, it can move to `/admin`; that is not needed now.

Every role-specific route is protected twice: `RequireAuth` plus a role guard in the frontend for navigation/UX, and server-side role-and-mine-scope authorization for every requested resource. A readable URL is not authorization. Visiting another role's URL must result in a redirect/403-style denied state, and must never expose data.

### 17. MineLevel today: count-only, no real shape/geometry — and an open question on embedding

Documented in response to a direct question (2026-09-06), not a resolved decision — no schema change made.

**Current state.** `MineLevel` (`backend/src/models/mine_level.py`) is its own collection: `mine_id`, `level` (a letter, e.g. `"A"`), `section_count` (an int). It carries no shape, geometry, or coordinate data of any kind. The demo layout is fixed and identical for every seeded mine (`research/saumy/06-maps-plan.md`): A=20, B=15, C=10.

The visual "shape" seen on the Mine Map (`frontend/src/components/MineLevelMap.tsx`) is generated **entirely client-side**, purely from `section_count` — a Voronoi diagram is built from N seed points, deterministically seeded by `level + section index` (stable across reloads, not reshuffled every visit), then clipped into cells. This is a presentation-layer illusion recomputed from a number; it has no relationship to any mine's real physical layout, and the backend has no opinion about shape at all.

**Open question: embed `MineLevel` on `Mine`, or keep it a separate collection?** Given today's actual usage — a fixed 3-level layout per mine, never queried independently of its owning mine, no per-level lifecycle (nothing creates or deletes a single level on its own), and no other collection ever references a `MineLevel` by its own id — embedding as `Mine.levels: list[{level, section_count}]` would be simpler and remove a collection/join for no real cost today. The tradeoff, if levels ever need independent identity (queried across mines, referenced by id elsewhere, given their own audit trail), is that a separate collection scales better for that. Not decided; revisit whenever the mine-registry work (Decision #14/Phase 8's mine management) next touches `Mine`'s shape.

---

## Part 1 — Make real-vs-mock legible (cheapest, do first)

**Mostly superseded by Decision #15's "Remove now" table** — written before Decisions #8–16 existed, back when the plan was "badge the mock stuff and migrate later." Decision #15 replaced that for most of the app: remove the mock UI outright rather than label it. The one place a `<DemoDataBadge />`-style marker might still be worth building is the handful of things Part 3's table below says to deliberately *keep* mocked for now (`OPERATING_MINES`, `LIVE_SENSORS` — no real `Mine`/`Asset` CRUD yet) — flagging as an open question rather than deciding: still want a badge component for those, or is "it's in this plan doc" enough?

A small `<DemoDataBadge />` component (a tiny "DEMO DATA" pill, similar visual weight to the existing `StatusBadge`), dropped into any page/section still rendering from `mockData.ts`. Not a redesign — one component, applied where needed.

**Per-tab inventory, current state**:

| Dashboard | Tab | Real or mock? |
|---|---|---|
| Worker | Report a Problem | **Real** — `POST /site-issues`, `GET /site-issues` (`07`) |
| Worker | Map | **Real** — `GET /mine-levels`, `GET /person-issues`/`site-issues` (`05`) |
| Worker | Tasks, generic Overview content, Notifications | Mock/unsupported — now removed or deferred; task/shift features return only with their backend workflows. |
| Worker | Profile | Partially real — convert to the basic read-only `/auth/me` fields; current role-specific fields are mock. |
| Safety Officer | Map | **Real** (shared `MineLevelMap`) |
| Safety Officer | Overview / Safety Issues queue | Current UI is mock, but it is the next real surface: combine real `SiteIssue` and `PersonIssue` records after RBAC migration. |
| Safety Officer | Monitoring, sensor calibration, Inspections, AI Assistant, Reports & History | Mock/unsupported — deferred. |
| Safety Officer | Profile | Partially real — convert to the basic read-only `/auth/me` fields; current role-specific fields are mock. |
| Admin | Users & Roles | **Regressed to mock by the merge** (was real `GET/POST /users` before) — see regression note in "Current structure." Needs reverting, not migrating. |
| Admin | System Health, Data & Storage, AI System, Activity Logs, Settings, Profile | Mock or static |
| Corporate | Profile | Partially real — convert to the basic read-only `/auth/me` fields. |
| Corporate | Overview, mine directory/map, risks, compliance, AI insights, reports | Mock/unsupported — deferred pending mine assignments and corporate-scoped APIs; cross-mine safety oversight is the first future real surface. |
| Regulatory | everything | Mock (`OPERATING_MINES`, `INITIAL_AUDIT_TRAIL`) |
| Shared shell | Notification badge/drawer, Global Search, footer | Mock/decorative — remove now; reintroduce only with backend support or real product content. |
| Landing page | Role picker / guest login | **Real, new since the merge** — `POST /auth/guest` via `loginAsGuest`, driven by `ROLES`/`DASHBOARD_PATH_BY_ROLE` (`utils/userTypes.ts`). No longer needs migrating — already off mock data. |
| `/worker` (reopened, Decision #1) | Offline observation submission | **Real** — `POST /inspections/observations`, IndexedDB queue, role-gated. Flagged separately for the Decision #12 conflict noted above. |

Once badged, this table becomes the tracking mechanism as tabs migrate to real routes + real data.

---

## Part 2 — Extract pages into real routed files

Superseded framing (per decision #2 above): this is no longer "same switch statement, separate files" — each page becomes a real `<Route>`.

Target shape:

```
pages/dashboard/worker/
  OverviewPage.tsx
  TasksPage.tsx
  ReportPage.tsx        (already the most real — becomes the template for the others)
  NotificationsPage.tsx
  ProfilePage.tsx
pages/dashboard/safety-officer/
  ...same idea, one file per current render___() function
```

Each role's current dashboard file goes away entirely, replaced by route entries in `App.tsx` (or a dedicated `routes/` config, matching the reference structure's `routes/` folder — open question below), each wrapped in a role guard.

**Do this role-by-role, cheapest/most-real first**: Worker → Admin → Safety Officer → Corporate/Regulatory. Each extraction independently verified (`tsc --noEmit` + `vite build`).

**Shared patterns worth a small hook once 2+ pages need it**:
- `useApiResource(url)` — the fetch-on-mount + loading/error dance, already duplicated in `WorkerDashboard.fetchSiteIssues` and `AdminDashboard.fetchUsers`. More justified than ever once every page fetches its own real data.
- A shared submit-with-toast pattern for forms — optional, only once a third form needs the same shape.

---

## Part 3 — Retire mock data role-by-role, tied to what backend work already exists

| Mock export | Real backend exists? | What to do |
|---|---|---|
| `INITIAL_TICKETS` / `addTicket` / `resolveTicket` | Partially — superseded by `PersonIssue`/`SiteIssue` (`06`/`07`); no equivalent to `Ticket.assigned_to`/resolution yet (deferred, see `06`'s Future Scope) | Retire from pages already migrated (Worker's Report page — done). Safety Officer's ticket-board-shaped tabs (`Incidents`) stay mock until the deferred corrective-action workflow gets designed. |
| `WORKER_TASKS` / `markTaskComplete` | No real equivalent — deferred along with attendance and task/inspection workflows | Remove from the current Worker surface; rebuild later from real data. |
| `AI_KNOWLEDGE_BASE` (Safety Officer's AI Assistant) | `ai_engine` has a capability, but no backend contract/proxy exists | Defer; do not wire it now. |
| `INITIAL_AUDIT_TRAIL` / blockchain hash display | No current real ledger; Decision #13 defines a future chained-hash audit ledger for finalized regulatory events | Remove the fabricated history. Build the real append-only audit history after versioned reports/actions exist. |
| `simulateHazard` / `resetHazard` / `broadcastEvacuation` | No — telemetry/WebSocket pipeline explicitly deferred (`06`'s Future Scope) | Remove from the current Safety Officer surface; rebuild only with real telemetry/alert workflows. |
| `OPERATING_MINES`, `LIVE_SENSORS` | No — real `Mine` CRUD beyond the one placeholder, and `TelemetryReading`, are both `08`-plan territory | Keep mock until `08`'s Mine/Asset work lands. |
| `NOTIFICATIONS_DATA` | No — no backend notification/WebSocket push system exists | Remove its shell UI now; reintroduce notifications only with a real backend/push system. |

---

## Sequence recap

**Authoritative phase breakdown now lives in `research/saumy/10-frontend-coding-plan.md`** — this list is kept as a one-line-per-phase mirror of it, not an independent sequence, specifically so the two can't drift out of sync the way this list and `10` briefly did (found and fixed 2026-09-06: `10` originally had no scheduled route-migration step for Corporate/Regulatory/Admin, and this list independently omitted the Admin-regression fix and Admin provisioning entirely while still listing a `DemoDataBadge` step that Decisions #8–16's "remove now" stance had already superseded). If you're reading phase detail, read `10`, not this list.

0. Revert the Admin regression (real `/users` restored) — standalone, no dependencies.
1. Decision #12: role + `mine_assignments` authorization foundation. (Also where `Inspection`'s placeholder-org fallback gets migrated, per the note above — not before.)
2. Remove unsupported shared chrome: notification badge/drawer, global search, simulated Wi-Fi toggle, dashboard footer.
3. Worker: personal-issue warning (needs a new `GET /person-issues/me`), real `/auth/me` profile, strip mock overview content. (`/worker` itself migrated onto `role`/`mine_assignments` as part of Phase 1, per Decision #1's resolution — kept, not a separate phase.)
4. Safety Officer: real combined Safety Issues queue, real overview, real profile.
5. Real per-page routes + `RequireRole` guard, migrating Worker and Safety Officer onto them.
6. Corporate: cross-mine issue oversight, **migrated onto real routes in the same phase** (not deferred to later).
7. Regulatory: trimmed report/verification loop only (actions/evidence/audit-ledger deferred to backlog; simplified to one Regulatory Authority for now — see Decision #13's "Regulator scope" note), **migrated onto real routes in the same phase**, plus a new Corporate Reports route.
8. Admin: delegated provisioning hierarchy + role changes + mine assignment/registry management (audit-event trail deferred, same as Phase 7's ledger), **migrated onto real routes in the same phase** — last role off `activeSubTab`.
9. Delete `dashboardDataStore.ts`/`data/mockData.ts` and the now-dead `activeSubTab`, once every consumer has migrated or been removed.

---

## Open questions — asked in chat, recorded here

**Deferred — still open:**

1. **What renders for pages with zero real backend once mock data is removed from them** (most of Corporate/Regulatory, several Safety Officer/Admin tabs) — an explicit "not yet available" empty state, or hold off removing mock data for those *specific* pages until their backend exists, even though other pages migrate sooner. Affects sequencing in Part 3. Not decided.
2. **`<DemoDataBadge>`** (Part 1) — mostly superseded by Decision #15's "remove now" stance, but still possibly worth building for the couple of things Part 3 says to keep mocked (`OPERATING_MINES`, `LIVE_SENSORS`). Not decided.

**Resolved:**

3. **Route config location — decided: a dedicated `routes/` folder**, matching the reference structure (image 5), not inline in `App.tsx`. See decision #7 above. Not yet built.
4. **`lib/` vs `utils/` — decided and executed**: renamed to `utils/`, `.gitignore` restored. See decision #5 above.
5. **Decision #1 (`/worker`) — decided: keep it**, reversing the original delete plan. See decision #1 above.
