# Cleanup Plan & Team Workflow Fix

> **Last updated:** 2026-09-02 (uncommitted — not yet pushed, exists only in this local working tree) · 
**Status:** CURRENT — process/cleanup plan

## Working agreement for this cleanup

All git operations — pulling from `main`/`frontend`/`feature/pwa-mobile-split`, staging, committing to `saumy`, and pushing — are done manually by the user (saumy), not by Claude. Claude's role is limited to preparing file/code content and documentation on request; it does not run `git add`/`git commit`/`git push` as part of this cleanup.

## Root cause

`research/lld.md` — the current authoritative design doc — was never committed or pushed to any branch. It existed only, uncommitted, in the local working tree on the `saumy` branch. Meanwhile `research/plan.md` (the older, now-partially-outdated design) has been sitting in every branch (`main`, `frontend`, `feature/pwa-mobile-split`) this whole time, so it was the only design doc teammates could actually see.

Navni and Akshat building against `plan.md` was not a mistake on their part — it was the only doc available to them. The actual failure was that the updated design never left one person's machine.

## Immediate actions

1. **Commit and push `research/lld.md`** to a branch everyone pulls from (`main`, or wherever the team agrees design docs live) before anything else in this plan.
2. **Mark `research/plan.md` as superseded** so nobody builds against it again. (In progress — a stamping pass is adding a `Last updated` / `Status` line to every tracked `.md` file in the repo, including this one, pointing superseded docs at `lld.md`.)
3. **Message the team directly**: "`research/lld.md` is now the design doc, `plan.md` is retired — re-check anything you built against roles/pages/models before merging." Don't rely on people noticing a new file on their own.

## Per-branch remediation (confirmed by audit)

Full detail in `research/branch-audit-main.md`, `research/branch-audit-frontend.md`, `research/branch-audit-pwa-mobile.md`. Summary and action items below.

### The one finding that changes everything: `frontend` and `feature/pwa-mobile-split` share no relevant git history

`feature/pwa-mobile-split` was branched from `main`, **not** from `frontend`. It contains none of Navni's actual changes (commit `72dce782`, +1684/-1453 lines) — its `frontend/desktop/` copy is byte-identical to the older pre-Navni scaffold (`a14f3f4a`, e.g. `Header.jsx` is the old 263-line version, not Navni's 165-line rewrite). "Akshat picked up Navni's work" is true informally (he had files on disk) but not true in git — there's no commit linking the two branches. **A normal merge/rebase between them will not reconcile this automatically.** Someone has to manually diff `frontend/desktop/` against `origin/frontend` file-by-file and take Navni's newer content. Do this before either branch merges to `main`, or Navni's work simply disappears the moment `feature/pwa-mobile-split` lands.

### `main`
- Frontend on `main` (commit `a14f3f4a`, author `js3799162-ctrl`, 2026-08-28) already has a `SIHEvaluatorDashboard.jsx` and per-role dashboards built against the old 7-role model — this predates Navni's and Akshat's work, so the stale-role problem started here, not with them.
- `main` has **two dead parallel entrypoints**: `App.jsx`/`main.jsx` (live — `index.html` actually loads `main.jsx`) and `App.tsx`/`main.tsx`/`vite-env.d.ts` (orphaned leftovers from the original TS scaffold, never removed when the JSX app was added). Delete the dead TS files, or commit to migrating the JSX app to TypeScript to match `lld.md` §2's stated stack — pick one, don't leave both.
- `backend/` has only `config.py` + `main.py` — nothing to reconcile yet, matches that backend work hasn't started.
- `ai_engine/` on `main` is har2312's work, already covered by `research/ai_engine_review.md`.

### `frontend` (Navni)
- 100% mock data, zero API calls — expected at this stage, not a problem by itself.
- RBAC hardcoded to the old 6-role model (`field_worker`, `safety_officer`, `corporate_management`, `regulatory_authority`, `system_admin`, `sih_evaluator`) in `AppContext.jsx`. Needs to move to `lld.md` §3's 5 roles.
- `SIHEvaluatorDashboard.jsx` (472 lines) — role no longer exists; delete or repurpose as the guest-login role-picker entry flow.
- `WorkerDashboard.jsx` — built as a single-user "field report" view; missing lld.md's actual Worker concept (many per mine, attendance, location ping).
- `SafetyOfficerDashboard.jsx` — missing the new `Attendance` page and worker-management additions.
- `CorporateDashboard.jsx`, `RegulatoryDashboard.jsx`, `AdminDashboard.jsx` — roles survived the RBAC simplification; these need a data-layer rework (real API + lld.md fields), not a conceptual rebuild. **Keep these.**
- Visual/layout system (`Header`, `Sidebar`, `GlobalSearchModal`, `NotificationsDrawer`, `ToastContainer`, `index.css`, common components) is reusable as-is — Navni's polish pass here is real value.
- `LoginPage.jsx` is also a keeper, not just the layout components — it's already a role-picker tile UI, functionally the same interaction `lld.md` §7a calls "guest login." Trim it to the 5 roles (drop the `sih_evaluator` tile) and eventually point `loginAsRole` at real `POST /auth/login` / `/auth/google` / `/auth/guest` instead of the local `DEMO_USERS` swap — the UI itself doesn't need rebuilding.
- `package.json` is literally named `"react-example"`, missing `axios`/`react-router-dom`/`zustand`/`echarts`/`leaflet` (everything `lld.md` §2 specifies), and has a stray unused `@google/genai` dependency — looks like it was bootstrapped from an unrelated template and never properly set up as this project's frontend. Needs an explicit decision + cleanup, not a silent dependency add.
- Branch is a few commits behind `main`'s recent `ai_engine` fixes — rebase onto current `main` before merging so it doesn't silently revert those Docker fixes.

### `feature/pwa-mobile-split` (Akshat)
- No data was actually deleted — the apparent deletions are git-detected renames into `frontend/desktop/` (see the history-split finding above for why that copy is nonetheless the *wrong* one to keep).
- Two generated build artifacts committed to git: `workbox-7e5eb42b.js` (3395 lines, duplicated in both `desktop/` and `mobile/`) and `frontend/mobile/dev-dist/registerSW.js`. Delete both, add `dev-dist/`, `workbox-*.js`, `sw.js` to `.gitignore` in both apps.
- Dead `main.tsx` scaffold file alongside the real `main.jsx`, in both `desktop/` and `mobile/` — delete, keep `main.jsx` only.
- Mobile app lives under `frontend/mobile/src/pages/inspector/` with UI text "Inspector Field App" — `lld.md` §3 renamed this to Worker. Mock data's `role: 'field_worker'` shows the rename is half-done; folder/component/UI copy still need to catch up. Also drop the `sih_evaluator` mock entry here too.
- `ObservationForm.tsx`'s POST body (`notes`/`category`/`severity`/`latitude`/`longitude`) doesn't match `lld.md` §4's `Observation` schema (`description`/`pillar`/`lat`/`lng`), and has no photo or voice-note capture at all (§7e requires both). Fine to leave until the backend schema is finalized, but flag it now so it's not forgotten.
- The offline-queue/geolocation mechanism itself (`useGeolocation.ts`, `useSyncManager.ts`, IndexedDB queue) is conceptually right and matches §7e/`SyncStatus` — just needs the data shape updated once the schema is final. **Keep this.**
- **No demo login exists in the live mobile app, and most of what looks like reusable code there is actually dead.** `index.html` loads `main.jsx`, which routes every URL directly to `InspectorApp` — no login screen, no role gate. `AppContext.jsx` (the same demo-login/`DEMO_USERS` system as Navni's `frontend` branch), `Header.jsx`, `Sidebar.jsx`, `mockData.js`, and even `App.tsx` (a more complete TS file with real routing, but never loaded by `index.html`) are all unused — `InspectorApp` doesn't import any of them. **Delete these rather than reconcile them** — there's nothing live in that code to preserve; only `InspectorApp.tsx`, `ObservationForm.tsx`, the two hooks, and the IndexedDB `lib/db` module are real.
- No README in `frontend/mobile/` or `frontend/desktop/` — moot once both fold into the single consolidated app per the plan below.

## Frontend architecture decisions (this cleanup pass)

Two decisions made while planning the consolidation, both driven by problems the branch audits actually surfaced (not preference alone):

### One responsive app, not separate desktop/mobile folders

`frontend/desktop/` and `frontend/mobile/` (introduced by the `feature/pwa-mobile-split` branch) are being dropped in favor of a single `frontend/` app with responsive layout (Tailwind breakpoints, flex/grid). Reasoning:
- `lld.md` §6 never designed two apps — it lists exactly one mobile-specific page (`SyncStatus`) and calls `NewInspection` "mobile-first," not "mobile-only." The two-folder split was never part of the design; it was introduced ad hoc and is the direct cause of the "no shared git history" problem in the per-branch section above.
- What differs between a Worker on a phone and a Safety Officer at a desk is **role**, handled by RBAC-gated routes — not device, which doesn't need a second codebase.
- The one real capability worth keeping from the mobile split — offline queueing + geolocation (`useGeolocation.ts`, `useSyncManager.ts`) — can be scoped to specific routes inside one app via `vite-plugin-pwa`, without needing a second Vite project.
- This also directly answers "how do we check desktop/mobile stay in sync": with one implementation there's nothing to drift — no parity check is needed because there's only one version of each component.

### Zustand replaces Context API for state management

`AppContext.jsx` currently holds everything (`mines`, `sensors`, `tickets`, `auditTrail`, `inspections`, `workerTasks`, `notifications`, `currentUser`, UI toggles) in one big React Context + `useState`. `lld.md` §2 specifies Zustand, so this migrates rather than staying as Context — split into a few focused stores (e.g. a `useAuthStore` for `currentUser`/login, a `useMineDataStore` for mines/sensors/tickets/inspections, a `useUiStore` for sidebar/search/notifications toggles) instead of one monolithic context. More work up front than leaving Context alone, but avoids a second stack inconsistency to fix later, and scales better once pages start pulling real API data instead of mock arrays.

### TypeScript only, enforced structurally

All frontend code converts to `.tsx`/`.ts`, no `.jsx`/`.js` going forward. This isn't just a style preference — the JSX/TSX mismatch already caused a real bug: dead orphaned `App.tsx`/`main.tsx`/`vite-env.d.ts` files sat unnoticed on `main` for over a week after a JSX app was added alongside them. To make sure a stray file can't silently coexist again:
- `tsconfig.json` sets `allowJs: false` — a `.jsx` file won't type-check.
- Add an ESLint rule / CI check that fails on any new `.jsx`/`.js` file under `frontend/src`.
- Existing `.jsx` files convert to `.tsx` as part of this pass; `any` types are acceptable short-term to unblock the conversion, full typing can follow.

## Frontend consolidation plan

Sequenced steps to reconcile `frontend` (Navni) and `feature/pwa-mobile-split` (Akshat) into one app on `saumy`, applying the two decisions above:

1. Base: Navni's `frontend` branch content (current dashboards/layout), rebased onto current `main` first so it doesn't revert `main`'s `ai_engine` Docker fixes.
2. Pull in Akshat's actual new work from `feature/pwa-mobile-split`'s `frontend/mobile/` — `InspectorApp`/`ObservationForm` (renamed to match `Worker` terminology, fields updated to `lld.md` §4's `Observation` schema, add photo + voice capture), `useGeolocation`, `useSyncManager` — as a new route/page (`NewInspection`) inside the one consolidated app, not a separate project.
3. Delete: `frontend/desktop/` entirely (confirmed stale duplicate of the pre-Navni scaffold), `frontend/mobile/`'s duplicated App shell/layout, both committed `workbox-*.js` build artifacts, `dev-dist/`, the dead `main.tsx` scaffold files, `SIHEvaluatorDashboard.jsx` (repurpose into the guest-login role picker), the unused `@google/genai` dependency, and fix `package.json`'s name off of `"react-example"`.
4. Convert everything to `.tsx`/`.ts`; add `allowJs: false` + the lint guard.
5. Install and wire up `axios`/`react-router-dom`/`zustand`/`echarts`/`leaflet` per `lld.md` §2 — none are installed on either branch yet. Migrate `AppContext.jsx`'s state into Zustand stores as part of this step (see the state-management decision above) rather than converting it 1:1 into a TS Context.
6. Add `vite-plugin-pwa` once on the single app, scoped to the inspection-submission routes.
7. Verify it builds and runs (`npm run dev`), then commit to `saumy` — done manually by the user per the working agreement above.
8. **Checkpoint before pushing to `main`**: this rewrites/discards a fair amount of both Navni's and Akshat's branches (the whole desktop split, the Evaluator dashboard, the package.json identity) — worth them knowing before it lands as what everyone pulls next, not finding out after.

## Process changes to prevent recurrence

1. **One doc, one merge, before anyone codes.** Design changes land on `main` (or a shared docs branch) *before* someone branches off to build against them. A decision that isn't pushed isn't decided yet, no matter how thoroughly it was discussed.
2. **Retire docs explicitly, don't just leave them.** When a doc is superseded, say so in the doc itself (status line) and tell the team — don't let two conflicting docs coexist silently.
3. **Short-lived branches, rebase onto the doc source often.** Akshat branched off Navni's already-stale branch, so the drift compounded. Rebasing onto `main` every day or two surfaces a doc update fast instead of letting three people diverge for days.
4. **Announce what you're starting.** A one-line "starting on X, based on lld.md §Y as of commit `<hash>`" before starting a feature costs nothing and makes divergence visible at the start, not at merge time.
5. **Version the design doc.** When `lld.md` changes on something someone's mid-implementation on, ping them specifically — don't assume they'll re-read the whole file.
6. **Don't leave a design doc uncommitted overnight, ever.** This is what caused the whole problem — a five-minute `git add && git commit && git push` after a design session would have prevented all of this.
