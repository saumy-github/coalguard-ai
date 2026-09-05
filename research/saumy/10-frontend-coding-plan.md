# Frontend Coding Plan — Phases for `09-changes-5-sep.md`

> **Last updated:** 2026-09-06 (uncommitted — not yet pushed, exists only in this local working tree) ·
**Status:** PLAN — awaiting your review. No code written yet. Implements `research/saumy/09-changes-5-sep.md`'s decisions, in dependency order.

Same relationship to `09` as `07`/`05` have to their own decision docs: that one is what and why, this one is concrete phases and files. Each phase is independently verifiable (`tsc --noEmit` + `vite build` on frontend, container restart + live endpoint checks on backend) before starting the next — don't batch phases.

---

## Why this order

Decision #12 (real role + `mine_assignments` model) is the foundation nearly everything else in `09` either depends on or gets more expensive to redo if built first. So: fix the one standalone regression, do the foundation, then work outward through Worker → Safety Officer → routes → Corporate → Regulatory → Admin → final cleanup. Decision #1 (`/worker`) is now resolved — it stays, migrating onto Phase 1's `role`/`mine_assignments` model like everything else rather than getting its own phase.

---

## Phase 0 — Revert the Admin regression

**Goal**: `AdminDashboard.tsx` talks to the real backend again, independent of everything else below.

1. `AdminDashboard.tsx` — replace the hardcoded `usersList` `useState` array with `GET /users` on mount (same pattern `WorkerDashboard.fetchSiteIssues` already uses).
2. `handleAddUser` — replace the local-array push with `POST /users`, matching the request shape `schemas/users.py` already expects.
3. Role `<select>` — replace `field_worker`/stale options with real `UserType` values from `utils/userTypes.ts` (`ROLES`), removing the `'field_worker'` default entirely.

**Checkpoint**: create a user through the Admin UI, confirm it's a real row in Mongo (`GET /users` from another session shows it), not just local state.

**DONE (2026-09-05)** — the form also needed real `email`+`password` fields added (the old mock form only collected name/role/org, none of which map onto `CreateUserRequest`); verified live via `POST /users` as a seeded Admin, confirmed the new user via `GET /users`, then deleted the test row.

---

## Phase 1 — Decision #12: role + `mine_assignments` authorization model

**Goal**: the foundation. No frontend *page* work yet — but this phase is **not backend-only**, correcting an earlier draft of this plan that hedged it as such. Decision #12's own target schema renames the field and its values (`user_type` → `role`, `worker | safety_officer | corporate_manager | regulator | admin` — shorter than today's `worker | mine_safety_officer | corporate_management | regulatory_authority | admin`), and that value flows through the JWT claim into every route check and the frontend's own `UserType`/`NAV_ITEMS_BY_ROLE`/`ROLES` in lockstep. This is a coordinated rename across the whole stack, not an additive-only backend change — doing it as a single atomic phase (full rebuild + retest after) is more appropriate here than a staged dual-read migration, since nothing is in production yet.

1. `backend/src/models/user.py` — rename `user_type` → `role`, update the `Literal` values to the five shortened names above.
2. `backend/src/models/mine_assignment.py` (new) — `MineAssignment(Document)`: `user_id`, `mine_id`, `role`, `active`, `assigned_at`, `revoked_at` (nullable).
3. `backend/src/auth/security.py` — JWT claim renamed `user_type` → `role` to match.
4. `backend/src/auth/dependencies.py` — rename `require_user_types` → `require_role` (new value set), add `require_mine_assignment(mine_id)` and `accessible_mine_ids(user)` reading `MineAssignment` (replaces `require_mine_scope`, which read `User.mine_id` directly).
5. Update **every** route file referencing the old field/values: `routes/auth.py`, `routes/users.py`, `routes/mine_levels.py`, `routes/person_issues.py`, `routes/site_issues.py`, `routes/inspections.py` — swap `require_user_types("mine_safety_officer", ...)`-style calls for `require_role("safety_officer", ...)` with the new value strings, and `require_mine_scope(user)` for the new assignment-based helpers.
6. `GET /auth/me` — return `role` (renamed) plus the caller's active assignments (mine IDs), not just the bare old `user_type`/`mine_id`.
7. Seed data: `seed_users.py`'s `SEED_USERS` and `auth/guest.py`'s `GUEST_SEED_USERS` — rename the `user_type` key to `role`, update every value to the new shortened set, and create a `MineAssignment` alongside each seeded user instead of relying on `User.mine_id` alone.
8. Frontend, same phase (can't lag behind the backend rename without breaking every login): `utils/userTypes.ts`'s `UserType`/`ROLES`/`DASHBOARD_PATH_BY_ROLE` values, `authStore.ts`'s `CurrentUser.user_type` field (rename to `role`), `Sidebar.tsx`'s `NAV_ITEMS_BY_ROLE` keys, `RequireAuth.tsx`'s `roles` prop values, and every dashboard component's `user?.user_type` read (all 5 dashboards + `Header`/`Sidebar`) — all updated to the new field name and values in the same pass.
9. Authorization tests: at minimum, a user with no assignment gets `403`/empty, and a cross-mine request is denied — per Decision #12's own test requirement.

**Deliberately not done here**: touching `Inspection`/`org_service.py`'s placeholder-org fallback (per `09`'s note — that's this phase's natural follow-on once it's stable, not part of the first pass) or removing `User.mine_id`/`subsidiary_id` entirely (Decision #12's own rollout sequence says remove only after every caller has migrated — they can stay as unused legacy fields through this phase, deleted later).

**Checkpoint**: log in as a seeded worker and a seeded officer (new role values, same credentials otherwise), confirm each can only reach their own mine's data through the migrated routes; confirm a user with zero assignments gets a clean denial, not a 500 or a silently-empty success that looks like "no data yet"; confirm the frontend's role-based nav/routing still resolves correctly post-rename (`tsc --noEmit` + `vite build`, then an actual login as each of the 5 roles).

**DONE (2026-09-05)** — one addition beyond the original scope list: also added a shared `services/mine_assignment_service.py` (`ensure_mine_assignment`, idempotent) so `seed_users.py` and `auth/guest.py` don't duplicate the same create-or-reactivate logic; both now call it for `worker`/`safety_officer` seeds. `/auth/me`'s response shape changed from bare `mine_id`/`subsidiary_id` strings to a `mine_ids: list[str]` array (matches `MineAssignment`, which is inherently multi-mine). The 10 pre-existing dev-DB users had the old `user_type` field renamed to `role` in place via a `mongosh` `$rename` (old→new value strings remapped first) rather than a drop+reseed, since real per-account data (guest vs. seeded, is_guest flags) was worth preserving even though it's all disposable dev/test data. Verified live: all 5 seeded logins + all 5 guest logins return a `role` claim with the new shortened values; `/auth/me`, `/mine-levels`, `/person-issues`, `/site-issues` all resolve correctly as a scoped Worker; a cross-role request (Admin → `/mine-levels`) gets a clean `403`; `tsc --noEmit` and `vite build` both pass clean.

---

## Phase 2 — Decision #8: remove unsupported shared chrome

**Goal**: stop presenting fake global features as if they work.

1. `Sidebar`/`Header`/`App` — remove the notification badge/drawer and global-search entry point + modal (`NotificationsDrawer.tsx`, `GlobalSearchModal.tsx` stop being rendered; leave the files for now rather than deleting, in case Decision #8's "add back with real backend" happens later — flag as a small follow-up decision, not blocking).
2. `Header.tsx` — remove the Wi-Fi/offline-mode toggle button (`isOfflineMode`), since it's simulated and the one real sync surface it implied (`/worker`) is a separate, still-undecided thing.
3. `DashboardLayout`/`AppShell` footer — remove.

**Checkpoint**: app still builds and runs with these three UI surfaces gone; nothing else references `isOfflineMode`/the removed components (grep before deleting imports).

**DONE (2026-09-05)** — `GlobalSearchModal.tsx`/`NotificationsDrawer.tsx` kept as files but no longer rendered from `DashboardLayout.tsx`, and their Header entry points (search/bell buttons) removed too, not just the modals — a rendered-nothing button was worse than no button. `uiStore`'s `isOfflineMode`/`setIsOfflineMode` deleted entirely (no longer referenced anywhere); `isSearchOpen`/`isNotificationsOpen` kept since the two dormant files still read them. Confirmed `/worker`'s real `WifiOff` online/offline indicator (genuine `navigator.onLine`, `useSyncManager.ts`) is unrelated and untouched. `tsc --noEmit` and `vite build` both pass clean.

---

## Phase 3 — Worker surface (Decision #9)

**Depends on**: Phase 1 (assignment-aware `GET /person-issues` filtering, and `/worker`'s own routes/hooks migrated onto `role`/`mine_assignments` per Decision #1's resolution — kept, not deleted).

1. Backend: add `GET /person-issues/me` (or extend the existing list endpoint to filter by `worker_id == current_user.id` for the `worker` role specifically) — required before any personal-issue UI, per `09`'s explicit warning about not client-side-filtering a broad response.
2. `WorkerDashboard.tsx` Overview — remove `Safety Status`, `Pending Reports`, `Quick Actions`, `Today's Shift`, `My Tasks` summary/list (per `09`'s "remove now" table). Replace with the personal-issue warning area: fetch `GET /person-issues/me`, render only `status=open` records with severity/observation/location/corrective info, nothing when there are none.
3. `WorkerDashboard.tsx` Profile — replace the mock employee ID/badge/shift/organization/PPE fields with a read-only view sourced from `GET /auth/me`'s actual fields (id, name, email, phone, role, mine_id, guest status). No edit form (backend has no update endpoint).
4. Remove `WORKER_TASKS`/`markTaskComplete` usage from this file entirely (mock export retirement, per `09` Part 3).

**Checkpoint**: a worker with an open `PersonIssue` assigned to them sees it on Overview; a worker with none sees nothing (not a fabricated "Safe" card); Profile shows only real `/auth/me` fields.

**DONE (2026-09-05)** — added `GET /person-issues/me` as a new, additive, worker-only route (`require_role("worker")` + `person_issue_service.list_person_issues_for_worker`, server-filtered by `worker_id`) rather than restricting the existing `GET /person-issues`: that endpoint is also used by the shared Mine Map (`MineLevelMap.tsx`, both Worker and Safety Officer) to flag which sections have any open issue, with no identity exposed — narrowing it to Safety Officer only would have broken the Worker's already-working map. The entire "My Tasks" surface (Overview's task list/summary card and the separate `renderTasks` tab) was removed, not just Overview's cards, since `09`'s "Tasks/inspections" is deferred work in full and `WORKER_TASKS`/`markTaskComplete` needed to go from this file entirely — the Sidebar's `tasks` nav entry for Worker was removed to match. `PageLayout`'s existing `attentionAlert` slot was used for the personal-issue warning rather than new markup. Corrective-action text is a small client-side lookup by `issue_type` (`PersonIssue` has no such field itself, per its intentionally minimal model). Verified live: created a `PersonIssue` for the seeded worker via a Safety Officer token, confirmed `GET /person-issues/me` returns only that worker's own record (server-filtered, not just client-filtered), confirmed a Safety Officer gets `403` on `/person-issues/me`; `tsc --noEmit` and `vite build` both pass clean.

---

## Phase 4 — Safety Officer surface (Decision #10)

**Depends on**: Phase 1.

1. Backend: no new endpoint needed — `GET /site-issues` + `GET /person-issues`, both already mine-scoped, already exist.
2. `SafetyOfficerDashboard.tsx` — new "Safety Issues" tab/page: fetch both endpoints, merge into one chronological, severity-first list, each row showing type/severity/location/observation/source/timestamp/recommended-action.
3. Overview — rebuild from the same two fetches (not a third data source): a critical-warning banner only when a real high/critical issue exists, open-issue counts, a short recent-unresolved list linking to the full queue. Remove the fabricated "Normal"/compliance-score/ticket-count cards.
4. Mine Map tab — already real (`MineLevelMap`), no change.
5. Profile — same `GET /auth/me` treatment as Worker's.
6. Remove from this file per `09`'s "remove now" table: simulated telemetry, calibration button, hazard/reset/evacuation controls, mock AI answers, mock inspection list, mock audit/history list.

**Checkpoint**: the Safety Issues queue shows real data across both collections, sorted correctly; Overview's counts match what the queue actually shows (no drift between two views of the same data).

**DONE (2026-09-05)** — both endpoints are fetched once at the top of the component and the resulting `combined` array is shared by Overview and the full queue, so there's no drift by construction (not just by convention). `SiteIssue.severity` (`NORMAL/WARNING/CRITICAL`) and `PersonIssue.severity` (`low/medium/high/critical`) are two different vocabularies — added a `normalizeSeverity` mapping onto one scale so a single sort and `StatusBadge` color both work across the merged list, while still showing each record's own original severity text as the badge label. `recommended_action` is real for Site Issues; for Person Issues (which has no such field) it's a small client-side lookup by `issue_type`, same pattern as Phase 3's Worker corrective-action text. Removed `renderMonitoring`/`renderIncidents`(ticket-based)/`renderInspections`/`renderAIAssistant`/`renderReportsHistory` entirely (all 100% mock, all in `09`'s "remove now"/deferred lists) and pruned the Sidebar's Safety Officer nav to `overview`/`issues`/`map`/`profile`. Verified live against the seeded Officer account's real data (3 open Site Issues incl. one CRITICAL, 1 open Person Issue) that counts and severity-first ordering are correct; `tsc --noEmit` and `vite build` both pass clean.

---

## Phase 5 — Decisions #2/#7: real per-page routes + `routes/` folder

**Depends on**: Phases 3–4 (there need to be real pages to route to) and Phase 1 (so `RequireRole` checks real assignments and the renamed `role` field, not the old `user_type`).

1. New `frontend/src/routes/` folder — route table(s) mapping path → page component → required role, replacing `App.tsx`'s inline `<Routes>`.
2. `RequireRole` component (`components/auth/`, alongside existing `RequireAuth`) — wraps `RequireAuth`, adds a role check redirecting to the user's own dashboard on mismatch (same UX principle already implemented in the merge's `RequireAuth.tsx` `roles` prop — reuse that, don't duplicate the hydration-race handling).
3. Migrate Worker's and Safety Officer's tabs (the two already-real surfaces from Phases 3–4) onto real routes first — `/dashboard/worker/report`, `/dashboard/worker/map`, `/dashboard/worker/profile`, `/dashboard/safety/issues`, `/dashboard/safety/map`, `/dashboard/safety/profile`, per `09` Decision #16's tree.

**Corporate/Regulatory/Admin deliberately stay tab-based here** — each migrates onto real routes as its own explicit last step within Phases 6/7/8 respectively, so their route wiring gets built once, alongside their real content, not redone afterward. `activeSubTab` itself isn't deleted until Phase 9, once all five roles are off it.

**Checkpoint**: refreshing the browser on `/dashboard/worker/map` lands correctly (not a blank tab-state reset); visiting a Safety Officer route as a Worker redirects instead of rendering.

**DONE (2026-09-05)** — `WorkerDashboard.tsx`/`SafetyOfficerDashboard.tsx` were split from one `activeSubTab`-switching component each into 3 named page exports apiece (`WorkerOverviewPage`/`WorkerReportPage`/`WorkerProfilePage`, `SafetyOverviewPage`/`SafetyIssuesPage`/`SafetyProfilePage`), each wrapping itself in `DashboardLayout` directly (same convention `MineMapPage.tsx` already used) rather than routes wrapping them — kept the route table itself flat and readable. Safety Officer's Overview/Issues pages share one new `utils/safetyIssues.ts` (the severity-merge logic from Phase 4, extracted so both pages read the literal same fetch+sort, not two copies that could drift). `RequireRole` (`components/auth/RequireRole.tsx`) wraps `RequireAuth` exactly as specified — checks a role mismatch only once `user` is already known (so it never races ahead of `RequireAuth`'s own hydration wait) and sends a mismatched user straight to their own real route tree (currently `worker`→`/dashboard/worker`, `safety_officer`→`/dashboard/safety`, both other roles fall back to generic `/dashboard`) instead of the extra hop through `Dashboard.tsx`'s redirect. `Dashboard.tsx` itself now redirects `worker`/`safety_officer` straight to their trees and only still renders Corporate/Regulatory/Admin directly (unmigrated). The old generic `/dashboard/map` route is gone, replaced by the two role-specific map routes — nothing else referenced it. Worker's Notifications tab (mock-data-backed, same source as the header bell/drawer already removed in Phase 2, and absent from Decision #16's route tree) was dropped entirely rather than left as an orphaned unrouted tab; `Sidebar.tsx`'s now-fully-dead `unreadCount`/`Bell`/`useDashboardDataStore` wiring was cleaned up alongside it. Verified: `tsc --noEmit` and `vite build` both pass clean; `vite preview` confirms a hard refresh on `/dashboard/worker` (deep link, not a client-side nav) serves the SPA correctly via history-fallback rather than 404ing.

---

## Phase 6 — Corporate Management (Decision #11)

**Depends on**: Phase 1 (mine assignments), Phase 5 (routes, so `/dashboard/corporate/*` exists to build into).

1. Backend: a Corporate-scoped issues endpoint (e.g. `GET /site-issues?corporate=true` or a dedicated route) returning issues only for mines with an active Corporate assignment for the caller — built on Phase 1's `accessible_mine_ids(user)` helper, never a client-supplied mine list.
2. `CorporateDashboard.tsx` — first real page: cross-mine safety-issue overview/queue, reusing the same issue-rendering approach as Safety Officer's queue where reasonable.
3. Profile — `GET /auth/me`, same pattern as before.
4. Everything else in this file (production, compliance, ESG, forecasts, reports) stays mock/deferred per `09` — don't build it now.
5. **Migrate onto real routes now, in this same phase** — reuse Phase 5's `routes/`/`RequireRole` infrastructure for `/dashboard/corporate`, `/dashboard/corporate/profile`. Don't leave Corporate on `activeSubTab` and migrate it later — that's rebuilding the same wiring twice.

**Checkpoint**: a Corporate user with 2 assigned mines sees issues from exactly those 2, not all mines and not zero.

**DONE (2026-09-05)** — went with extending the existing endpoints rather than a dedicated route: `GET /site-issues`/`GET /person-issues` now accept `corporate_manager` too and branch internally (single-mine `require_mine_assignment` for Worker/Safety Officer, multi-mine `accessible_mine_ids` + a new `In(...)`-based `list_*_for_mines` for Corporate) — this meant the frontend's existing `fetchCombinedIssues()` helper (Phase 4/5) worked for Corporate completely unchanged, no new endpoint plumbing needed on that side. Added `mine_id` to `UnifiedIssue` (not needed before — Safety Officer only ever sees one mine) and extracted the row-rendering JSX out of `SafetyOfficerDashboard.tsx` into a shared `components/common/IssueRow.tsx` (`showMine` prop) so Corporate's merged multi-mine list can label which mine each row belongs to, without duplicating that block a second time. Corporate's own seed/guest accounts didn't have a `MineAssignment` at all before this phase (Phase 1 deliberately hadn't added one yet) — added it to both `seed_users.py` and `auth/guest.py`. Checkpoint verified with a real temporary second `Mine`: Corporate saw only its 1 mine's issues (3) before a second assignment, then exactly 1+1=4 after being assigned the second mine too (not all mines, not zero) — temporary mine/issue/assignment deleted after. Per `09`'s "remove now" table, deleted (not just hid) the entire mock My Mines/Risks/Compliance/AI Insights/Reports tabs — none of them have a route in Decision #16's tree. Migrated onto real routes in this same phase per the plan's own instruction (`/dashboard/corporate`, `/dashboard/corporate/profile`), including `RequireRole`'s own-dashboard map and `Dashboard.tsx`'s redirect. `tsc --noEmit`, `vite build`, and `vite preview` (deep-link check on both new routes) all pass clean.

---

## Phase 7 — Regulatory Authority (Decision #13, trimmed scope)

**Depends on**: Phase 1, Phase 5 (routes/`RequireRole`), Phase 6 (Corporate's own real route tree — this phase extends it with a Reports page).

**Scope for this phase, decided in discussion, not the full Decision #13**: build the core two-party report loop only — Corporate submits a mine-level report, Regulator reviews/verifies it. `regulatory_actions`/`regulatory_action_evidence` (formal notices, evidence) and the append-only hash-chained audit ledger are **explicitly deferred** — real backlog items, not built now (see Decision #15-style deferred list). Regulator scope is simplified to **exactly one Regulatory Authority account** per Decision #13's new "Regulator scope" note — no `regulator_assignments` collection yet, no per-mine regulator assignment; a regulator sees every mine with an active Corporate Management assignment, full stop.

1. `backend/src/models/mine.py` — add `lat: Optional[float]`, `lng: Optional[float]`.
2. Seed data — a **second** demo mine + `MineLevel` set + Corporate Management account, so the regulator's aggregate pages have more than one mine to aggregate: keep the existing placeholder mine as ECL (Sector 7G) with real coordinates, add a new mine for BCCL (Moonidih) with its own coordinates and its own Corporate Management test + guest account (`ensure_mine_assignment`'d to the new mine, same pattern as Phase 6). Reuses org names already used as flavor text on the Landing page.
3. `backend/src/models/regulatory_report.py` (new) — `RegulatoryReport(Document)`:
   ```python
   RegulatoryReportType = Literal["corporate_submission", "regulatory_verification"]
   RegulatoryReportStatus = Literal["submitted", "under_review", "verified", "disputed"]

   class RegulatoryReport(Document):
       mine_id: PydanticObjectId
       reporting_period: str          # free-text label, e.g. "September 2026" — not a real date-range query filter yet
       report_type: RegulatoryReportType
       status: RegulatoryReportStatus
       parent_report_id: Optional[PydanticObjectId] = None   # links a verification (or a resubmission) to what it responds to
       submitted_by_user_id: PydanticObjectId
       submitted_at: datetime
       total_safety_issues: int        # server-computed from real SiteIssue+PersonIssue at submission time — never client-supplied
       critical_issues: int            # server-computed
       resolved_issues: int            # server-computed
       average_resolution_time_hours: Optional[float] = None   # corporate-declared only (Decision #13) — no real resolution workflow exists to measure it
       notes: Optional[str] = None     # corporate's declaration text, or the regulator's findings
   ```
   No document is ever mutated after creation — "current status" for a mine+period is always just whichever report is most recent in its `parent_report_id` chain, computed at read time on the frontend. This is the plain reading of Decision #13's "immutable additions... never an overwrite of history," without building the actual hash-chain ledger.
4. `backend/src/auth/dependencies.py` — `accessible_mine_ids(user)` gets a new branch: if `user.role == "regulator"`, return the distinct `mine_id`s of every active `MineAssignment` with `role == "corporate_manager"` (not a lookup on the regulator's own assignments — it has none). Every other role's branch is unchanged.
5. `backend/src/routes/mines.py` (new) — `GET /mines`, role-scoped (`corporate_manager`/`regulator` via `accessible_mine_ids`, `admin` sees all): returns `{id, name, lat, lng}` per mine. Nothing exposed this returns a mine list yet — needed by both this phase's Mines page and Phase 8's later provisioning UI.
6. `backend/src/routes/regulatory_reports.py` (new):
   - `POST /regulatory-reports` (`corporate_manager`) — body `{mine_id, reporting_period, average_resolution_time_hours?, notes?}`; validates `mine_id` is in the caller's `accessible_mine_ids`; server-computes the three issue counts from that mine's real `SiteIssue`/`PersonIssue` records; inserts with `report_type="corporate_submission"`, `status="submitted"`.
   - `POST /regulatory-reports/{id}/respond` (`regulator`) — body `{status: "under_review"|"verified"|"disputed", notes?}`; validates the target report is a `corporate_submission` whose `mine_id` is in the regulator's `accessible_mine_ids`; inserts a **new** `RegulatoryReport` with `report_type="regulatory_verification"`, `parent_report_id` = the target's id, fresh server-computed issue counts (a new snapshot, not copied from the original), the given `status`/`notes`.
   - `GET /regulatory-reports` (`corporate_manager` or `regulator`) — role-scoped by `accessible_mine_ids`; returns every report (both types) for those mines, sorted newest first.
7. Frontend: `RegulatoryDashboard.tsx` split into real pages, same pattern as Worker/Safety Officer/Corporate:
   - `RegulatoryOverviewPage` (`/dashboard/regulatory`) — aggregate KPIs derived from the latest report per (mine, period): mines reporting, reports awaiting a regulator response (latest-in-chain is still a `corporate_submission`), total/critical issues summed, average declared resolution time. No raw incident feed.
   - `RegulatoryMinesPage` (`/dashboard/regulatory/mines`) — one card per assigned mine (`GET /mines`) showing name, coordinates, and its latest report's headline numbers. Cards, not an actual map widget — this codebase has no geo-mapping library, and adding one to plot two points isn't worth it; revisit if the mine count grows.
   - `RegulatoryCompliancePage` (`/dashboard/regulatory/compliance`) — one row per assigned mine showing its *current* derived status (latest report in the chain) and a "respond" action when the latest is an unanswered `corporate_submission`.
   - `RegulatoryReportsPage` (`/dashboard/regulatory/reports`) — full chronological thread per mine: every submission and verification, not just the latest.
   - `RegulatoryProfilePage` (`/dashboard/regulatory/profile`) — same `GET /auth/me` treatment as every other role.
8. Frontend: extend Corporate's own route tree (built in Phase 6) with a new `CorporateReportsPage` (`/dashboard/corporate/reports`) — submit a report for one of the manager's assigned mines, and see the report thread for those mines. Decision #16's original tree didn't list this route because the report workflow didn't exist yet when that tree was written; this is the natural, in-scope extension now that it does.
9. **Migrate onto real routes now, in this same phase** — the 5 Regulatory routes above, plus Corporate's new `/dashboard/corporate/reports`.

**Deliberately not done here** (explicit backlog, not silently dropped): `regulatory_actions`/`regulatory_action_evidence` (formal notices, corrective-action evidence, verify/reject), the append-only chained-hash audit ledger, Regulator-authored Inspections, and the `regulator_assignments` collection needed once a second regulator exists.

**Checkpoint**: Corporate submits a report for their mine with real computed issue counts (not hand-typed); the Regulator sees it under Compliance, responds with a verification; both Corporate and Regulator see the same two-entry thread under Reports; a mine with no reports yet shows an empty state, not an error; the Regulator's Overview/Mines aggregate across *both* seeded mines, not just one.

**DONE (2026-09-05)** — built exactly as scoped above, no deviations. `accessible_mine_ids` now branches on role: `regulator` derives its set from every active `corporate_manager` MineAssignment (not its own — it has none); everyone else unchanged. Added `GET /mines` (new, role-scoped) since Decision #16's Mines page had no endpoint to read from at all before this phase. Frontend: `utils/regulatoryReports.ts` holds the shared fetch/grouping/status-badge logic (`groupIntoThreads` derives "current status" per mine+period as whichever report is newest — no report is ever mutated), used by both `RegulatoryDashboard.tsx`'s 5 pages and `CorporateDashboard.tsx`'s new `CorporateReportsPage`. Verified live end-to-end: ECL's real 4 issues (2 critical) computed correctly on submission, Regulator's `verified` response created as a fresh linked document (not a mutation), both parties see the identical 2-entry thread; BCCL's second corporate account correctly gets `403` submitting for ECL's mine; a Safety Officer gets a clean `403` on `/regulatory-reports`; seeded a second real report (BCCL, left unanswered) so the Regulator's Overview genuinely shows one mine verified and one awaiting review, not a single trivial case. `tsc --noEmit`, `vite build`, and `vite preview` deep-link checks on all 6 new/changed routes all pass clean.

---

## Phase 8 — Admin provisioning (Decision #14)

**Depends on**: Phase 1 (assignments to create), Phase 0 (real `/users` already restored), Phase 5 (routes/`RequireRole`), Phase 7 (`GET /mines`, being extended here with `POST /mines`).

**Scope trim, consistent with Phase 7's precedent**: the audit-event trail Decision #14 asks for ("every creation... produces an audit event") is **not built** — same treatment as Phase 7's deferred ledger. Admin's own "Activity Logs" tab is *also* explicitly deferred in Decision #14's own text, so there's no consumer for audit events yet either; building the producer without the consumer isn't worth it now. Deactivation/removal and "protect the last active admin" are moot until a deactivate endpoint exists — noted as backlog, not built. A newly Corporate-created mine reaching the Regulator: **no separate acceptance step is built** — it just becomes visible via Phase 7's existing derived rule (every mine with an active `corporate_manager` assignment), consistent with that phase's one-regulator simplification rather than Decision #14's literal "explicit regulator assignment" text.

1. `backend/src/services/provision_service.py` (new) — one central `provision_user(actor, ...)` enforcing the delegation table exactly:
   ```python
   DELEGATION_HIERARCHY: dict[UserType, set[UserType]] = {
       "admin": {"worker", "safety_officer", "corporate_manager", "regulator", "admin"},
       "regulator": {"corporate_manager"},
       "corporate_manager": {"safety_officer"},
       "safety_officer": {"worker"},
   }
   ```
   `403` if `role not in DELEGATION_HIERARCHY.get(actor.role, set())` — this alone blocks every peer/upward case Decision #14 lists. Mine-scope constraints per actor: Safety Officer's new Worker must land on a mine the officer is themselves assigned to; Corporate's new Safety Officer must land on a mine the corporate manager is themselves assigned to; Regulator creating a Corporate gets **no** `mine_id` at all (Decision #14: "creates the corporate identity/role only"); Admin's `mine_id` is optional and unchecked against its own scope (global). On success, creates the `User` then `ensure_mine_assignment`s it if a mine-scoped role got a `mine_id`.
2. `backend/src/routes/users.py` — `POST /users` now goes through `provision_service.provision_user` instead of `user_service.create_user` directly, and its `require_role("admin")` widens to `require_role("admin", "regulator", "corporate_manager", "safety_officer")` — the hierarchy check inside decides who can actually create what, not the route guard. `UserResponse` gains `mine_ids: list[str]` (same `accessible_mine_ids` computation `/auth/me` already uses) so the Admin directory can show real assignments, not just role.
3. `backend/src/routes/users.py` — new `PATCH /users/{user_id}/role` (`admin` only): changes a user's role. Guards: an admin cannot change their own role (self-escalation), and cannot demote the last active `admin`.
4. `backend/src/routes/mine_assignments.py` (new) — `POST /mine-assignments` (`admin` only, body `{user_id, mine_id}`, wraps the existing `ensure_mine_assignment`) and `DELETE /mine-assignments/{id}` (`admin` only, soft-revoke: `active=False`, `revoked_at=now`).
5. `backend/src/routes/mines.py` — new `POST /mines` (`admin` or `corporate_manager`): creates a `Mine`; if the actor is `corporate_manager`, auto-creates their own active `MineAssignment` to it (Decision #14, verbatim).
6. `AdminDashboard.tsx` split into real pages, same pattern as every other role:
   - `AdminUsersPage` (`/dashboard/admin/users`) — real directory (`GET /users`, showing role + mine assignment count) + the create-user form, now actually going through the provisioning endpoint with a mine picker for mine-scoped roles.
   - `AdminMinesPage` (`/dashboard/admin/mines`) — mine directory (`GET /mines`, admin sees all) + a create-mine form.
   - `AdminAccessPage` (`/dashboard/admin/access`) — per-user role-change dropdown and mine-assignment add/revoke, the two capabilities that don't fit naturally on Users or Mines alone.
   - `AdminProfilePage` (`/dashboard/admin/profile`) — same `GET /auth/me` treatment as every other role.
   - System Health, Data & Storage, AI System, Activity Logs, Settings — deleted entirely (100% mock, no route in Decision #16's tree, same "remove not hide" treatment every other role's mock tabs got).
7. **Migrate onto real routes now, in this same phase** — the 4 routes above. This is the last of the 5 roles to migrate — after this phase, `activeSubTab` and `uiStore`'s `activeSubTab` state have no remaining reader anywhere in the app (confirmed, not deleted yet — that's Phase 9).

**Checkpoint**: a Safety Officer account cannot create another Safety Officer via the API (`403`, not just hidden in the UI); a Corporate Manager creating a Safety Officer for a mine they don't manage gets rejected; a Corporate Manager creating a mine automatically gets an active assignment to it; an Admin cannot demote themselves or the last remaining admin.

**DONE (2026-09-06)** — `provision_service.DELEGATION_HIERARCHY` is a strict allow-list (not a denial rule), so every peer/upward case Decision #14 lists is blocked by construction, not by enumerating each forbidden pair. `POST /users`' `require_role` widened to every actor role that can legitimately provision someone; the hierarchy check inside decides who can create what. Added `GET/POST/DELETE /mine-assignments` (Admin only) beyond the original sketch, since exposing revoke in the UI needs real assignment IDs, not just the bare mine-id list `/auth/me` already returns — `UserResponse` gained `mine_ids` too, reusing that same `accessible_mine_ids` computation. `AdminDashboard.tsx` split into 4 pages matching Decision #14's 5 stated capabilities 1:1 onto Decision #16's 4 routes: Users (create + directory), Mines (registry), Access (role changes + mine assignment grant/revoke), Profile. The last-admin guard in `change_role` is real but currently unreachable in practice — the self-change block (also required) already guarantees the admin count can never hit zero through this one endpoint, so the count check only starts doing real work the moment a second pathway to change an admin's role exists; kept anyway since it directly encodes Decision #14's stated rule cheaply. System Health/Data & Storage/AI System/Activity Logs/Settings deleted entirely, matching every other role's "remove not hide" treatment of 100%-mock tabs. Verified live end-to-end and then cleaned up every throwaway account/mine/assignment the verification created (careful not to touch the real seed accounts or the two intentional demo mines): Safety Officer blocked creating a peer, blocked assigning a Worker to a mine they don't manage; Corporate blocked creating a peer, allowed creating a Safety Officer on their own mine, mine creation auto-assigns the creator; Regulator creating a Corporate gets zero mine grant; an admin cannot change their own role; with 2 admins, demoting one succeeds; grant/revoke via `/mine-assignments` round-trips correctly. `tsc --noEmit`, `vite build`, and `vite preview` deep-link checks on all 4 new routes pass clean.

---

## Phase 9 — Final cleanup

**Goal**: only once every consumer above has migrated.

1. Delete `dashboardDataStore.ts` and `data/mockData.ts` — check no import remains first (`grep -rn "mockData\|dashboardDataStore"`).
2. Delete `uiStore.ts`'s `activeSubTab` — safe now, since Phases 5–8 each migrated their role onto real routes as they went, nothing reads it anymore.
3. Reconcile `research/lld.md` against whatever actually shipped (per `06`'s own deferred item, still applicable).

**DONE (2026-09-06), items 1–2.** Item 3 (`lld.md` reconciliation) was deliberately skipped at the time this note was first written, per explicit instruction — since then, done separately as its own full rewrite (2026-09-06, same day) rather than a Phase 9 sub-step; see `research/lld.md` directly and `research/INDEX.md` for its status. Found one thing the original phase text didn't anticipate: `GlobalSearchModal.tsx`/`NotificationsDrawer.tsx` were kept as dormant, unrendered files back in Phase 2 specifically "in case a real backend justifies them later" — but they were still importing `dashboardDataStore`/`mockData`, making them the *only* remaining consumers standing between here and step 1. Deleting a data layer to keep two already-unreachable files alive made no sense, so both files were deleted outright rather than kept as permanently-broken imports — a natural, necessary consequence of this phase, not scope creep. That also let `uiStore.ts` lose `isSearchOpen`/`isNotificationsOpen` (their only remaining readers) alongside `activeSubTab` itself. `Sidebar.tsx`'s `NavItem.path` went from optional to required and `handleNavClick`/`isActive` simplified to a single `navigate(item.path)`/`location.pathname === item.path` — the tab-fallback branch they used to need has had zero callers since Phase 8. `data/` is now an empty, deleted directory. Verified: `tsc --noEmit`, `vite build`, and a `vite preview` smoke test across all 9 routes (`/`, `/login`, `/worker`, `/dashboard`, and all 5 roles' real trees) all pass clean; a full-tree grep for every retired mock export (`WORKER_TASKS`, `NOTIFICATIONS_DATA`, `OPERATING_MINES`, `LIVE_SENSORS`, `AI_KNOWLEDGE_BASE`, etc.) turns up nothing.

---

## Explicitly parked, not part of this phase sequence

- **The `Inspection`/`org_service.py` placeholder-org conflict** (`09`'s note) — resolved as a natural side-effect of Phase 1, not a standalone phase.

---

## Sequence recap

0. Revert Admin's mock-data regression.
1. Role + `mine_assignments` foundation.
2. Remove unsupported shared chrome.
3. Worker: personal-issue warning, real profile, strip mock overview. (`/worker` itself migrates onto `role`/`mine_assignments` as part of Phase 1 — kept, per Decision #1's resolution.)
4. Safety Officer: real Safety Issues queue, real overview, real profile.
5. Real per-page routes + `RequireRole`, migrating Worker/Safety Officer onto them.
6. Corporate: cross-mine issue oversight — **and** migrated onto real routes, same phase.
7. Regulatory: trimmed report/verification loop only (actions/evidence/audit-ledger deferred; simplified to one Regulatory Authority) — **and** migrated onto real routes, same phase, **plus** Corporate gets a new Reports route.
8. Admin: delegated provisioning hierarchy + role changes + mine assignment/registry management (audit-event trail deferred, same as Phase 7's ledger) — **and** migrated onto real routes, same phase (last role off `activeSubTab`).
9. Delete `mockData.ts`/`dashboardDataStore.ts`/dead `activeSubTab`.
