# Branch Audit — `feature/pwa-mobile-split` (Akshat)

> **Last updated:** 2026-09-01 (uncommitted — not yet pushed, exists only in this local working tree) · 
**Status:** CURRENT — audit report

Read-only audit. Compares this branch against `research/lld.md` (current authoritative design) and against `frontend` (Navni's branch) and `main` at the git level. No code was changed while producing this report.

Branch name note: the user referred to this as `frontend/pwa-mobile-split`; the actual branch on `origin` is **`feature/pwa-mobile-split`**.

## TL;DR

- **No data was deleted.** The dashboard files that looked like pure deletions in a naive diff are git-detected renames (at `-M20%` similarity) from `frontend/src/...` into the new `frontend/desktop/...` — content intact, mostly just whitespace/formatting changes.
- **The real problem is worse than terminology drift: this branch has no git relationship to Navni's `frontend` branch at all.** `feature/pwa-mobile-split` was branched from `main`, not from `frontend`. Its `frontend/desktop/` copy is byte-identical to the *old* pre-Navni-update scaffold (commit `a14f3f4a`) — none of Navni's actual changes in `72dce782` (1684 insertions, 1453 deletions) are present. Example: `Header.jsx` in this branch is 263 lines (the old version); Navni's `frontend` branch has a 165-line rewrite of the same file.
- **Two generated build artifacts are committed to git**: `workbox-7e5eb42b.js` (3395 lines, a Workbox v7.4.0 runtime bundle) exists in *both* `frontend/desktop/` and `frontend/mobile/`, and `frontend/mobile/dev-dist/registerSW.js` (vite-plugin-pwa's dev-mode output directory) is also committed. Neither should be in source control.
- **Terminology is a genuine but smaller issue**: the mobile app is built around an `inspector/` folder and "Inspector Field App" UI text, while `lld.md` §3 renamed this role to Worker. Mock data actually already uses `role: 'field_worker'`, so the rename is partially done — just not carried through the folder/page names. Mock data also still has a `sih_evaluator` role, which `lld.md` §3 removed.
- **No demo login exists in the live app at all, and most of the copied code is dead.** `index.html` loads `main.jsx`, which routes every URL straight to `InspectorApp` — no login screen, no role gate. The demo-login system (`AppContext.jsx`'s `DEMO_USERS`/`loginAsRole`), `Header.jsx`, `Sidebar.jsx`, and `mockData.js` were all copied into `frontend/mobile/` but `InspectorApp` never imports any of them — they're unused. See §7.
- **`Observation` fields in the actual form don't match `lld.md` §4's schema** (`notes`/`category`/`severity`/`latitude`/`longitude` vs. the spec's `description`/`pillar`/`lat`/`lng`), and there's no photo or voice-note capture at all, though §7e requires both.

---

## 1. Git relationship — the branch is not built on Navni's work

```
git merge-base origin/main origin/feature/pwa-mobile-split  →  27b3fa02 (main's own tip)
git merge-base --is-ancestor origin/main origin/feature/pwa-mobile-split  →  YES
git merge-base --is-ancestor 72dce782 origin/feature/pwa-mobile-split     →  NO   (72dce782 = Navni's frontend commit)
```

`feature/pwa-mobile-split` = `main` (at `27b3fa02`) + one commit, `7ca612f8 "feat: extract mobile PWA into separate frontend/mobile app"`. It never merged, rebased onto, or cherry-picked anything from the `frontend` branch. The `frontend/` directory it started from is whatever was last on `main` — which is the original `a14f3f4a "overall frontend"` scaffold, predating all of Navni's work in the `frontend` branch.

Confirmed directly:
```
git show origin/frontend:frontend/src/components/layout/Header.jsx | wc -l        → 165  (Navni's current version)
git show origin/feature/pwa-mobile-split:frontend/desktop/.../Header.jsx | wc -l   → 263  (old version)
git show a14f3f4a:frontend/src/components/layout/Header.jsx | wc -l               → 263  (matches old version exactly)
```

So "Akshat picked up Navni's work" is true informally (he had the files on disk, presumably copied by hand or from an old local checkout) but **not true in git** — there is no commit history linking the two. If either branch is merged into `main` as-is, the other's independent changes are simply gone; a normal `git merge`/rebase between `frontend` and `feature/pwa-mobile-split` will not "just work" because they don't share the relevant history — it'll need a manual reconciliation of `frontend/desktop/` against the real `frontend` branch content.

Practical effect on the specific files that looked like deletions in a plain `--stat`: at `-M20%` rename-detection, git does pair them up (`AdminDashboard.jsx`, `CorporateDashboard.jsx`, `LandingPage.jsx`, `LoginPage.jsx`, `RegulatoryDashboard.jsx`, `SafetyOfficerDashboard.jsx`, `WorkerDashboard.jsx` all show as renames with modifications, mostly trailing-whitespace normalization). The one exception is `SIHEvaluatorDashboard.jsx`: old version 472 lines, new (desktop) version 347 lines, and git can't pair them even at 20% similarity — this one was substantially rewritten, not just moved.

## 2. Directory split: what actually happened

The commit does two things at once:
1. **Renames** `frontend/src` → `frontend/desktop/src` (i.e., splits the existing single-page app into an explicit "desktop" variant), carrying over the full page/dashboard set.
2. **Adds** a brand-new `frontend/mobile/` app — a separate Vite+TS project (own `package.json`, `vite.config.ts`, `tsconfig.json`, `tailwind.config.js`, `vercel.json`, own 8176-line `package-lock.json`) containing only: shared `common`/`layout` components (copied fresh, not shared/imported from desktop), an `AppContext.jsx`, a `mockData.js` (583 lines), and one real feature — `pages/inspector/InspectorApp.tsx` + `ObservationForm.tsx` with geolocation + offline-queue-and-sync hooks.

Nothing else from the dashboard set (Admin/Corporate/Regulatory/SafetyOfficer/Worker dashboards) exists in `frontend/mobile/` — it is scoped to the field-reporting flow only, which matches the intent of a PWA for field workers.

## 3. Committed build artifacts (should not be in git)

- `frontend/desktop/workbox-7e5eb42b.js` and `frontend/mobile/workbox-7e5eb42b.js` — **identical**, 3395 lines each, a Workbox v7.4.0 UMD runtime bundle. This is a generated file `vite-plugin-pwa` normally emits into `dist/` at build time, hashed filename included. Committing it duplicates 6790 lines of generated code into the repo and it'll go stale the moment the plugin version changes.
- `frontend/mobile/dev-dist/registerSW.js` — `dev-dist/` is `vite-plugin-pwa`'s dev-mode-only output directory. Also committed. `frontend/mobile/registerSW.js` (a second, separate copy at the app root) is also present.
- Neither `frontend/desktop/.gitignore` nor `frontend/mobile/.gitignore` excludes `dev-dist/`, `workbox-*.js`, or `sw.js`/`registerSW.js` — both `.gitignore` files are otherwise identical (`node_modules/`, `build/`, `dist/`, `coverage/`, `.DS_Store`, `*.log`, `.env*` + `!.env.example`) and simply never accounted for `vite-plugin-pwa`'s output.
- `frontend/mobile/main.jsx` (15 lines, real entry — imports `InspectorApp`, wraps in `BrowserRouter`) **and** `frontend/mobile/main.tsx` (10 lines, generic Vite scaffold default — imports `./App.tsx`) both exist side by side. Same duplication exists in `frontend/desktop/`. `main.tsx` is dead leftover scaffold cruft in both apps (traceable to the original `npm create vite` default entry file from early project setup) — it's not wired to anything real and should be deleted, keeping only `main.jsx`.

## 4. Terminology vs. `lld.md` §3/§4

- The whole mobile feature lives under `frontend/mobile/src/pages/inspector/`, and the UI literally renders "Inspector Field App" (`InspectorApp.tsx`). `lld.md` §3 explicitly renamed this role from Field Inspector to **Worker** ("there are many Workers per mine, not a single inspector role").
- `frontend/mobile/src/data/mockData.js` is actually already halfway there: its role key is `role: 'field_worker'` / `roleTitle: 'Field Worker'` — not "inspector" — so the rename was partially applied to data but not to the folder name, component name, or UI copy. Needs to converge on lld.md's plain `worker` role value and naming throughout.
- `mockData.js` still defines a `sih_evaluator` demo user (`role: 'sih_evaluator', roleTitle: 'SIH Evaluator'`) — `lld.md` §3 removed the Evaluator role entirely in favor of guest login for the other 5 roles. This mock user needs to go (or become a guest-login demo entry for one of the real roles).
- No `site_engineer` role appears anywhere in mock data — consistent with `lld.md` (Site Engineer was folded into Mine Safety Officer), so nothing to fix there.

## 5. `Observation` data shape vs. `lld.md` §4/§7e

`ObservationForm.tsx` builds and POSTs this object to `` `${VITE_API_URL}/api/observations` ``:
```js
{ notes, category, severity, latitude, longitude, timestamp, synced }
```
`lld.md` §4's embedded `Observation` schema is:
```
{ description, photo_urls, voice_note_url, lat, lng, pillar }
```
Mismatches:
- `notes` vs `description` — just a naming difference.
- `latitude`/`longitude` vs `lat`/`lng` — naming difference.
- `category` + `severity` (two fields) vs `pillar` (one field, safety/environment/production/labour) — the form's `category` dropdown defaults to `'Safety'`, roughly matching `pillar`, but `severity` doesn't correspond to anything on `Observation` in the spec (severity lives on `Ticket`, not `Observation`, per §4).
- **No photo capture and no voice-note capture at all** — the form is text-notes-only. `lld.md` §7e requires both ("they add one or more Observations (description, photos, optional voice note)").
- The endpoint path `/api/observations` is a guess with no backend yet to confirm against — `backend/src` doesn't exist yet (per the user, backend coding hasn't started), so this can't be wrong yet, but it will need to be reconciled once real routes exist.

The offline-queue mechanics themselves (`useGeolocation.ts` watching position, `useSyncManager.ts` queuing via IndexedDB — `getPendingObservations`/`addObservation`/`markObservationSynced` from a `../lib/db` module, syncing on reconnect) line up well conceptually with `lld.md` §7e's offline-queue-and-auto-sync requirement and the `SyncStatus` page in §6 — the mechanism is right, the data shape just needs to be updated to match the schema once it's final.

## 6. Documentation

No `README.md` exists in either `frontend/mobile/` or `frontend/desktop/` explaining scope, how to run, or what backend it expects. Given these are now two separate Vite apps with their own `package.json`/`vite.config.ts`, each should probably get a short README (or `SETUP.md` should be updated to cover both).

## 7. What's actually live vs. dead code in `frontend/mobile`

Beyond the `main.jsx`-is-live / `main.tsx`-is-dead finding in §3, tracing the real import graph shows more of this app is inert than it first appears:

- **Live path**: `index.html` loads `/src/main.jsx`, which renders `<Routes><Route path="*" element={<InspectorApp />} /></Routes>` — i.e. *every* URL in this app renders the field-inspection form directly. There is no login screen, no role picker, no route gating of any kind.
- **Dead path**: `main.tsx` → `App.tsx` is never loaded by `index.html`, but ironically `App.tsx` is the more complete file — it's real TypeScript, built on the original project scaffold (`api.get('/health/db')` health check), with an actual `BrowserRouter` (`/` → a "Command Center" placeholder page with a link, `/inspector` → `InspectorApp`). None of this runs.
- **Also dead**: `AppContext.jsx` (293 lines — the same `DEMO_USERS`/`loginAsRole` demo-login logic documented in `research/branch-audit-frontend.md` for Navni's `LoginPage`, plus mines/sensors/tickets/audit-trail/worker-task state), `Header.jsx`, `Sidebar.jsx`, and `mockData.js` (583 lines) were all copied into `frontend/mobile/` but **`InspectorApp.tsx` never imports `AppContext`** — none of this code executes. It's the full old dashboard's state management, carried along for a single-page field form that doesn't use any of it.

Net effect: of everything in `frontend/mobile/src/`, only `pages/inspector/InspectorApp.tsx`, `ObservationForm.tsx`, `hooks/useGeolocation.ts`, `hooks/useSyncManager.ts`, and the IndexedDB `lib/db` module actually run. Everything else in that tree (the login/demo-user system, the dashboard context, the layout components, the mock data) is dead weight that should be deleted rather than reconciled — there's nothing live in it to preserve.

## 8. Everything unrelated to Akshat's commit

The diff also shows `ai_engine/.dockerignore`, `ai_engine/Dockerfile`, and `ai_engine/requirements.txt` changes — these are **not** Akshat's changes. They're already on `main` (this branch's base) and only show up in a `frontend`-vs-`this-branch` diff because the `frontend` branch itself is a few commits behind `main` on the `ai_engine` side. Not an issue with this branch; flagging so it isn't misattributed.

---

## 9. Concrete fix list

1. **Reconcile with Navni's actual `frontend` branch.** Someone needs to manually diff `frontend/desktop/` (this branch) against `origin/frontend` (Navni's real latest) file-by-file and take her newer content — a plain merge won't do this automatically since the branches share no relevant history.
2. **Remove committed build artifacts**: delete both `workbox-*.js` files and `frontend/mobile/dev-dist/`, add `dev-dist/`, `workbox-*.js`, `sw.js` to both `.gitignore`s.
3. **Delete the dead `main.tsx` scaffold file** in both `frontend/desktop/` and `frontend/mobile/`, keep `main.jsx`.
4. **Delete the unused `AppContext.jsx`, `Header.jsx`, `Sidebar.jsx`, `mockData.js`, and dead `App.tsx` from `frontend/mobile/`** (§7) — none of it is imported by the live `InspectorApp` path, it's not worth reconciling, just remove it. If a login/role-gate is ever needed on the mobile app specifically, it should come from the consolidated single-app auth (per `research/cleanup-plan.md`'s single-app decision), not this dead copy.
5. **Rename `inspector/` → align with `lld.md`'s Worker terminology** — folder, component name, UI copy, and the `sih_evaluator` mock entry should be dropped.
6. **Update `Observation` field names and add photo/voice-note capture** in `ObservationForm.tsx` once the backend schema is final, to match `lld.md` §4/§7e.
7. **Add a README to `frontend/mobile/` and `frontend/desktop/`** describing scope and how to run each independently — moot if/once both fold into the single consolidated app.
