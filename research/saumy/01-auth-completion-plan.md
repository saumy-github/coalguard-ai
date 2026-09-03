# Auth Completion Plan — In-House + Google Sign-In, Admin-Created Accounts

> **Last updated:** 2026-09-02 (uncommitted — not yet pushed, exists only in this local working tree) · 
**Status:** CURRENT — Phases 1–7 and 9–12 executed and verified (`tsc --noEmit` + `vite build` clean, backend smoke-tested against the seeded users); Phase 8 explicitly not started, see its section below

Scope: finish in-house + Google auth end-to-end, add a DB seed script for basic test users, build the frontend pages needed. Builds on `research/lld.md` §3/§4/§7a/§7p.

---

## Decisions locked in (this session)

- **No self-service sign-up, no activation step.** An Admin creates a `User` with email/phone/password already set. That person logs in immediately with those credentials — there is no "complete your account" flow and no token to build for it.
- **Login identifier is email *or* phone**, not email-only. Phone is primary — most Workers will only have a phone, not an email. A `User` can have both.
- **Sessions last "forever."** No refresh-token system — a very long JWT expiry (years, not hours) delivers "log in once, stay logged in" without building token rotation. Tradeoff, stated plainly: a leaked token stays valid until it hits that expiry; there's no server-side revocation. Acceptable for now, worth remembering later.
- **Sign-out ships before password reset.** Order is: real login → sign-out → (later, separate phase) forgot/reset password.
- **Password reset delivery mechanism is still open** — a phone-primary user base makes "email a reset link" unreliable as the *only* path (many Workers have no email). Don't need to solve this now since it's an explicitly later phase; flagging so it's decided deliberately when we get there, not defaulted into something that doesn't fit half the users.
- **Mine/Subsidiary CRUD doesn't exist yet** (`lld.md` §7b, unbuilt). Assigning a `mine_id` to a new `User` needs *something* to point at. Fix: the seed script (Phase 4) also creates one placeholder `Subsidiary`/`Mine` if none exist — not full CRUD, just enough to unblock user creation. Building real Mine CRUD is separate, later work.

---

## Phase 1 — Backend: identifier-based login + phone field

1. `models/user.py` — add `phone: Optional[str] = None`.
2. `schemas/auth.py` — `LoginRequest.email: EmailStr` → `LoginRequest.identifier: str` (accepts either).
3. `services/auth_service.py` — `login_with_password` looks up `User.email == identifier` **or** `User.phone == identifier`, rest of the flow (verify hash, check `active`, issue token) unchanged.
4. `login_with_google` stays exactly as-is (matches by email only — a phone-only user simply can't use Google sign-in, which is expected).

**Testable via `/docs`** once done: log in with a manually-inserted test user by either field.

## Phase 2 — Backend: Admin creates a user

1. New `models/mine.py` — minimal `Mine` (`subsidiary_id`, `name`) and `Subsidiary` (`name`, `code`) documents, just enough to have something `mine_id` can reference. Not the full `lld.md` §4 `Mine` schema (no `boundary_geojson`/EC caps/etc. yet) — that's separate work when §7b actually gets built.
2. New `schemas/users.py` — `CreateUserRequest` (email optional, phone optional — at least one required, validated in the schema; password; `user_type`; `mine_id`/`subsidiary_id` optional; `full_name`; `role_title`).
3. New `services/user_service.py` — `create_user(...)`: hash the password, insert the `User` (`has_login=True`, `active=True`, `is_guest=False`).
4. New `routes/users.py` — `POST /users` (create, Admin-only via `require_user_types("admin")`) and `GET /users` (list, Admin-only — the `Users` page needs something to list, not just a blank create form).
5. Register the router in `main.py`, add `Mine`/`Subsidiary`/`User` to `init_beanie`'s `document_models`.

**Testable via `/docs`**: an Admin token can create a user with a password and immediately log in as them (Phase 1).

## Phase 3 — Backend: persistent sessions + sign-out endpoint

1. Bump `JWT_EXPIRE_MINUTES` to an effectively-permanent value (config-only change, `.env`/`.env.example` — e.g. 10 years in minutes). No code change needed, `create_access_token` already takes this from `settings`.
2. `POST /auth/logout` — trivial/no-op on the backend (JWT is stateless, nothing to invalidate server-side), added mainly for symmetry and so the frontend has a real endpoint to call rather than only clearing local state. Document plainly that this does not revoke the token.

## Phase 4 — Seed script

1. `backend/scripts/seed_users.py`:
   - Creates one placeholder `Subsidiary` + `Mine` if none exist (see "decisions locked in").
   - Creates one real, password-set `User` per `user_type` (5 total) — mix of phone-identified (Worker, matching the "phone is primary" reality) and email-identified (the other 4 roles), distinct from `is_guest` accounts.
   - Prints the generated/fixed test credentials to stdout when run — never hardcodes them into a committed file.
   - Idempotent — skip-if-exists, same pattern as `ensure_guest_users_seeded`.
2. `docker-compose.yml` — add `./backend/scripts:/app/scripts` volume mount to the `backend` service (currently only `src/` is mounted, so the script isn't visible in a running container without this).
3. Run via `docker compose exec backend python scripts/seed_users.py`.

## Phase 5 — Frontend: real Login page

1. `frontend/src/lib/api.ts` — add an axios request interceptor attaching `Authorization: Bearer <token>` from the auth store to every request.
2. New Zustand store `useAuthStore` (token, current user, `login`, `loginWithGoogle`, `logout` actions; token persisted to `localStorage` so "log in once, stay logged in" survives a page reload).
3. `frontend/src/pages/auth/Login.tsx` (new, `.tsx`) — identifier field (accepts email or phone, no format-locking to `email` type), password field, "Sign in with Google" button (Google Identity Services JS SDK, needs `VITE_GOOGLE_CLIENT_ID` in `frontend/.env`). Calls `POST /auth/login` / `POST /auth/google`.
4. This **replaces** the current mock: `LoginPage.tsx`'s tile role-picker was the `DEMO_USERS` swap — that UI is set aside for now (it's the right shape for the *guest*-login flow later, once guest seeding happens, not for real login).

**Testable in-browser**: log in as a Phase 4 seed user, land on the (still role-aware-mocked) dashboard with a real token in hand.

**Update, later same session**: the Google Sign-In button built here is now disabled by a flag (`GOOGLE_AUTH_ENABLED = false` in `Login.tsx`) — the `.env` value it was tested against turned out to be a Google API key, not an OAuth Client ID. All the code above is unchanged and correct; it's just not exposed in the UI until a real Client ID exists. Full detail in `research/saumy/02-google-auth-deferred.md`. Doesn't affect Phases 6 onward.

**Also done as follow-on work after Phase 5** (not originally its own phase, noting it here for the record): `react-router-dom` got wired up for real — `BrowserRouter` in `main.tsx`, a `RequireAuth` route guard (waits for Zustand `persist` rehydration before deciding, so a valid session doesn't flash a redirect on reload), a public `/` route rendering the existing `LandingPage` (its buttons now `navigate('/login')` instead of the old mock's `setActiveView('login')`), and `/login`/`/worker` routes. Phases 9+ below build on this routing, not on the old `activeView` switch.

## Phase 6 — Frontend: sign-out — DONE

1. A sign-out action in the shared shell (`Header.tsx` or `Sidebar.tsx`) — calls `POST /auth/logout`, clears the Zustand store + `localStorage`, redirects to `/login`.

**What actually happened**: `Sidebar.tsx` already had a real "Sign Out" button (built earlier, wired to the old mock `AppContext.logout()`). Phase 6 turned out to be a rewire, not new UI: it now calls `useAuthStore().logout()` (hits `POST /auth/logout`, clears the token) then `navigate('/login')`.

## Phase 7 — Frontend: Admin "add user" form — DONE

1. Extend the `Users` admin page with a create-user form matching Phase 2's `POST /users` (email/phone, password, user type, mine/subsidiary picker, full name, role title) and a list view backed by `GET /users`.

**What actually happened**: `AdminDashboard.tsx`'s "Register New User" form now posts real `{email, phone, password, user_type, full_name}` to `POST /users` (role title and mine/subsidiary picker skipped — no Mine/Subsidiary picker UI exists yet, matches the "not full CRUD yet" note above) and the "Authorized Operator Directory" list now fetches from `GET /users` on mount instead of local mock state. Smoke-tested directly against the running backend (`admin@example.com` / `test123` from the Phase 4 seed) — login, `/auth/me`, and `/users` all return the expected shape.

## Phase 8 — Forgot / reset password (later, separate pass) — NOT STARTED

Still not started — explicitly sequenced after sign-out, and this run's instruction was "execute all the remaining phases," not this one specifically. Before this phase starts, the delivery-mechanism question above needs an answer (SMS OTP for phone-identified users? Admin manually resets it? Email link only for the users who have an email?) — revisit then, not guessed at now.

---

## Why Phases 9–12 exist

After Phase 5, real login works but lands nowhere real: `Login.tsx` calls `navigate('/')`, which is the *public* `LandingPage` route — and even routed correctly, there's still nothing connecting "who actually logged in" to "which dashboard to show." The 5 role dashboards (`WorkerDashboard`, `SafetyOfficerDashboard`, `CorporateDashboard`, `RegulatoryDashboard`, `AdminDashboard`) are real, already-built code — Navni's work — but they're only reachable through `AppContext`'s old `activeView` switch, which only the old mock `loginAsRole()` ever sets. `useAuthStore` (Phase 5) and `AppContext` are two totally disconnected systems that happen to coexist in the same app right now.

This is the Zustand migration already flagged as separate work in `research/cleanup-plan.md` ("migrate `AppContext`'s state into Zustand stores") — Phases 9–12 are that migration, scoped concretely.

**What this migration is *not***: a redesign. Every dashboard's JSX, Tailwind classes, and layout stay exactly as Navni built them — only the data plumbing underneath changes (props/hooks swapped, no visual changes). It's also not "build a real backend for tickets/mines/telemetry" — that's the rest of `lld.md`'s build order (a much bigger, separate effort). Dashboards keep reading the *same* mock arrays (`OPERATING_MINES`, `LIVE_SENSORS`, `INITIAL_TICKETS`, etc.) they already do — just served from a Zustand store instead of `AppContext`, and clearly labeled as placeholder content with a pointer to which future backend endpoint (per `lld.md`) eventually replaces each one. Only the **auth/identity/routing** layer becomes fully real in this pass — not the dashboard content.

**Current full inventory of `AppContext`, confirmed by reading the file** (12 consumers: `App.tsx`, `ToastContainer`, `GlobalSearchModal`, `Header`, `NotificationsDrawer`, `Sidebar`, `AdminDashboard`, `CorporateDashboard`, `LoginPage`, `RegulatoryDashboard`, `SafetyOfficerDashboard`, `SIHEvaluatorDashboard`, `WorkerDashboard`):
- Identity/nav: `currentUser`, `activeView`, `activeSubTab`, `preSelectedRole` — all replaced by `useAuthStore` + real routes.
- UI toggles: `isSidebarOpen`, `isSearchOpen`, `isNotificationsOpen`, `isOfflineMode`, `toasts` — pure UI state, no backend involved.
- Simulation flags: `isHazardSimulated`, `evacuationBroadcasted` — demo-only state, not tied to login at all.
- Domain data: `mines`, `sensors`, `tickets`, `auditTrail`, `inspections`, `workerTasks`, `notifications` — the actual dashboard content, currently 100% mock.
- Actions: `addToast`/`removeToast`, `loginAsRole` (dead after this migration), `logout` (superseded by `useAuthStore.logout`), `addTicket`, `resolveTicket`, `simulateHazard`, `resetHazard`, `broadcastEvacuation`, `markTaskComplete`.

## Phase 9 — Frontend: split `AppContext` into focused Zustand stores — DONE

1. `frontend/src/store/uiStore.ts` — `isSidebarOpen`, `isSearchOpen`, `isNotificationsOpen`, `isOfflineMode`, `activeSubTab`, `toasts` (+ `addToast`/`removeToast`). Pure UI state, no API calls, ports over near-verbatim.
2. `frontend/src/store/dashboardDataStore.ts` — `mines`, `sensors`, `tickets`, `auditTrail`, `inspections`, `workerTasks`, `notifications`, plus `addTicket`/`resolveTicket`/`simulateHazard`/`resetHazard`/`broadcastEvacuation`/`markTaskComplete`, ported from `AppContext`. Initialized from the existing `mockData.ts` arrays (kept — recharacterized as placeholder seed content, not "demo login data"). Each field gets a one-line comment noting the future backend endpoint that replaces it (e.g. `tickets` → `GET /tickets` once `lld.md` §7f's backend exists).
3. Delete `AppContext.tsx` once every consumer below is migrated off it — no partial state, this is an all-or-nothing swap since `useApp()` throws if called outside `AppProvider`.

**What actually happened**: both stores built as planned. `dashboardDataStore.ts`'s mutating actions (`addTicket`, `resolveTicket`, `simulateHazard`, ...) needed the current user's name/role for audit-log entries, which `AppContext` used to get from `currentUser` directly — they now read `useAuthStore.getState().user` and format it through two new small helpers in `frontend/src/lib/userDisplay.ts`: `displayName(user)` (falls back through `full_name` → `email` → `phone` → `"Operator"`) and `userTypeLabel(user_type)` (maps the real `user_type` value to the same display strings the old mock `roleTitle` used, e.g. `mine_safety_officer` → "Mine Safety Officer"). Toasts triggered from inside `dashboardDataStore` call `useUIStore.getState().addToast(...)` directly (module-level `getState()`, not a hook) to avoid a circular import between the two stores. `AppContext.tsx` deleted.

## Phase 10 — Frontend: role-based dashboard routing — DONE

1. New `frontend/src/pages/Dashboard.tsx` — reads `useAuthStore().user.user_type`, renders the matching dashboard:
   `worker` → `WorkerDashboard`, `mine_safety_officer` → `SafetyOfficerDashboard`, `corporate_management` → `CorporateDashboard`, `regulatory_authority` → `RegulatoryDashboard`, `admin` → `AdminDashboard`. Matches `lld.md` §6's actual design ("`Dashboard` — same route, content varies by role") rather than one URL per role.
2. New `frontend/src/components/layout/DashboardLayout.tsx` — the shared shell (`Header`, `Sidebar`, `GlobalSearchModal`, `NotificationsDrawer`, `ToastContainer`, footer) extracted from the old `MainContent`, unchanged visually, wraps `<Outlet />` or `{children}`.
3. `App.tsx` — replace the `/*` → `AppProvider`+`MainContent` route with `/dashboard` → `RequireAuth` + `DashboardLayout` + `Dashboard`.
4. ~~`Login.tsx` — fix `navigate('/')` → `navigate('/dashboard')`~~ — done early, ahead of the rest of this phase, since it was a harmless one-line change on its own (falls through to the same protected catch-all today; becomes correct once this phase's real `/dashboard` route exists).
5. Each of the 4 surviving dashboards + `Header`/`Sidebar`/`GlobalSearchModal`/`NotificationsDrawer`/`ToastContainer` — swap `useApp()` for `useAuthStore()` (identity) + `useUiStore()` (UI toggles) + `useDashboardDataStore()` (content), same data shape, no JSX changes.

**What actually happened**: all built as planned, plus `WorkerDashboard` (the 5th dashboard — the plan text above said "4 surviving" but meant all 5; `Worker` was just as much a consumer as the other 4). `Header.tsx` also lost its dead `activeView`-based conditionals (hamburger/notifications used to hide on the `landing`/`login` mock views — moot now that `Header` only ever renders inside `DashboardLayout`) and its `loginAsRole('sih_evaluator')` demo shortcut button, and its page-title tag now shows `userTypeLabel(user_type)` instead of switching on the old `activeView` string. `Sidebar.tsx`'s nav-item menus now key off the real `user_type` (Phase 12, folded in here since the file was already being rewritten) and `handleNavClick` no longer computes a `targetView` — there's only one `/dashboard` route now, so a nav click just sets `activeSubTab`. One real type error surfaced and was fixed: `onClick={simulateHazard}` / `onClick={resetHazard}` in `SafetyOfficerDashboard.tsx` passed the click's `MouseEvent` straight into the store action's typed `silent?: boolean` parameter (silently accepted as `any` under `AppContext`'s untyped functions) — wrapped both as `onClick={() => simulateHazard()}`.

## Phase 11 — Remove dead mock-auth code — DONE

1. Delete `LoginPage.tsx` (old tile-picker, imports `DEMO_USERS`, fully superseded by real `Login.tsx`).
2. Delete `SIHEvaluatorDashboard.tsx` — the Evaluator role doesn't exist in RBAC anymore (`lld.md` §3), and after this migration nothing can route to it.
3. Remove `DEMO_USERS` and any now-unused mock-login exports from `mockData.ts`.
4. Grep sweep for leftover imports of anything deleted above, to catch stragglers before calling this done.

**What actually happened**: all three deleted; grep confirmed no remaining references to `useApp`, `AppContext`, `SIHEvaluatorDashboard`, `LoginPage`, or `DEMO_USERS` anywhere in `frontend/src` before deletion.

## Phase 12 — Reconcile role-key naming — DONE (folded into Phase 10)

The old mock system's role keys don't match our real `user_type` values (`field_worker`/`safety_officer`/`system_admin` vs. real `worker`/`mine_safety_officer`/`admin`). Audit the 4 surviving dashboards and `Header`/`Sidebar` for any hardcoded comparisons against the old keys (display labels, conditional rendering, etc.) and update them to the real `user_type` strings — this is a correctness pass, not a redesign.

**What actually happened**: done as part of rewriting `Sidebar.tsx` in Phase 10 (its `getNavItems()`/`handleNavClick()` were the only places comparing against the old role keys). The 5 dashboard files themselves never compared against role-key strings directly — they only read `currentUser.roleTitle`/`.organization`/etc. as display text, which Phase 10 already replaced with `userTypeLabel(user?.user_type)` and the new optional `CurrentUser` fields (see below) — so there was no separate reconciliation pass needed there.

**One naming gap surfaced and resolved during Phase 10, not anticipated when this phase was written**: the dashboards/`Sidebar` also read several purely cosmetic fields off the old mock user object that the real backend `User` model doesn't have at all — `organization`, `badgeNumber`, `department`, `employeeId`, `mineAssigned`, `shift`. These are now optional fields on `authStore`'s `CurrentUser` type (always `undefined` today — the backend doesn't send them — so they render blank rather than breaking compilation). If any of these should become real, they'd need adding to the backend `User` model and `CurrentUserResponse` schema first; not done here since it's outside this plan's auth scope.

---

## Resolved

- **Password rules** — no minimum length or complexity enforced. Whatever an Admin types when creating a user is accepted as-is (Phase 2's `CreateUserRequest.password: str`, no validator added).
- **`GET /users` scope** — stays Admin-only. Not opened up to Corporate Management; revisit only if a real need for it shows up later.
- **Frontend email-format check (new, not in the original phase list)** — `Login.tsx` now does a basic client-side check on the identifier field: if it contains `@` (i.e. it's clearly meant to be an email, not a phone number), it's validated against a simple `name@domain.tld` pattern before the request is even sent, showing "Enter a valid email address" inline if it fails. Phone-shaped input is untouched — no format enforced there, matching "no restrictions" for passwords in spirit. This is deliberately basic (not full RFC 5322 validation) — good enough to catch an obvious typo, not a security boundary; the backend doesn't re-validate this and shouldn't need to, since a malformed identifier simply won't match any real user either way.
