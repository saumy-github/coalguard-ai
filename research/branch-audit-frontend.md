# Branch Audit — `frontend`

> **Last updated:** 2026-09-01 (uncommitted — not yet pushed, exists only in this local working tree) · 
**Status:** CURRENT — audit report

Audited: `origin/frontend` (tip `72dce782`, "Add frontend changes", author **Navni Mahendroo**, 2026-09-01) diffed against `origin/main`. Read-only investigation — no code changed as part of this audit.

## TL;DR

- **Zero API integration.** No `axios`/`fetch` calls anywhere in `frontend/src`. Every dashboard renders from a static `frontend/src/data/mockData.js`. This is expected at this stage, but means nothing here is wired to the backend contract in `lld.md` yet — it's pure UI.
- **RBAC is the old 6-role `plan.md` model, hardcoded.** `AppContext.jsx`'s `DEMO_USERS`/`loginAsRole` switch has `field_worker`, `safety_officer`, `corporate_management`, `regulatory_authority`, `system_admin`, `sih_evaluator`. `lld.md` §3 has 5 roles and **no Evaluator** (replaced by a guest-login mechanic on the other roles) — yet there's a full 472-line `SIHEvaluatorDashboard.jsx` built for it.
- **Tech stack doesn't match `lld.md` §2 at all.** `package.json` is literally named `"react-example"`, pulls in `@google/genai` (installed but unused — dead dependency, likely leftover from whatever template/AI app-builder this was bootstrapped from), `express`, `motion`, Tailwind **v4** (lld.md assumes v3-style config). None of `axios`, `react-router-dom`, `zustand`, `echarts`, `leaflet`/`react-leaflet` are installed. There's no routing library — navigation is a manual `activeView` string switch inside Context.
- **A JSX-vs-TypeScript split already existed on `main` before Navni touched anything** — not something her branch introduced, but it's live and unresolved. See below.
- **The branch is also stale against `main`'s own recent `ai_engine` work**, purely because it was cut before those commits landed and was never rebased — a latent merge conflict, unrelated to Navni's actual frontend work but worth knowing about before merging.

---

## 1. The pre-existing JSX/TypeScript split (not Navni's doing)

`main` currently has **both** a JSX app and the original TS scaffold, side by side:

```
frontend/src/App.jsx      + frontend/src/main.jsx   (JSX dashboard app)
frontend/src/App.tsx      + frontend/src/main.tsx   (original Vite+TS+Tailwind scaffold)
```

History (`git log origin/main --oneline --reverse -- frontend/`):
1. `4858f8fa` "vercel deployed" — **saumy-github**, 2026-08-26 — this is the original TS scaffold (`App.tsx`, `main.tsx`, `vite-env.d.ts`) that got deployed to Vercel.
2. `a14f3f4a` "overall frontend" — **js3799162-ctrl**, 2026-08-28 — added the entire JSX dashboard app (`App.jsx`, `main.jsx`, all of `components/views/*`, `context/AppContext.jsx`, `data/mockData.js`) **without removing** the TS files.
3. `72dce782` "Add frontend changes" — **Navni Mahendroo**, 2026-09-01 — Navni's commit. Only modifies files already on the JSX side (see diffstat below); does not touch `App.tsx`/`main.tsx` at all.

`frontend/index.html` on `main` confirms which one is actually live:
```html
<script type="module" src="/src/main.jsx"></script>
```
**The JSX app is the real entry point.** `App.tsx`/`main.tsx`/`vite-env.d.ts` are dead, orphaned files that nothing loads — a leftover from the earlier scaffold, never cleaned up when `a14f3f4a` added the JSX app on 2026-08-28. Navni built on top of the side that was already live; she isn't responsible for the split existing, but it should be cleaned up (delete the dead `.tsx`/orphaned files, or decide to actually migrate the JSX app to TS) as part of the same pass that fixes everything else.

## 2. What Navni's commit (`72dce782`) actually changed

```
 ai_engine/.dockerignore                                     |   6 -
 ai_engine/Dockerfile                                         |  28 +-
 ai_engine/requirements.txt                                   |   1 +
 frontend/index.html                                          |   2 +-
 frontend/src/App.jsx                                         |  15 +-
 frontend/src/components/common/StatusBadge.jsx               |   2 +-
 frontend/src/components/common/ToastContainer.jsx            |   4 +-
 frontend/src/components/layout/GlobalSearchModal.jsx         |   6 +-
 frontend/src/components/layout/Header.jsx                    | 204 +------
 frontend/src/components/layout/NotificationsDrawer.jsx       |   2 +-
 frontend/src/components/layout/Sidebar.jsx                   |  67 ++-
 frontend/src/components/views/AdminDashboard.jsx             | 246 ++---
 frontend/src/components/views/CorporateDashboard.jsx         | 337 ++++----
 frontend/src/components/views/LandingPage.jsx                | 180 +++--
 frontend/src/components/views/LoginPage.jsx                  | 177 +++--
 frontend/src/components/views/RegulatoryDashboard.jsx        | 251 +++---
 frontend/src/components/views/SIHEvaluatorDashboard.jsx      | 485 +++++++----
 frontend/src/components/views/SafetyOfficerDashboard.jsx     | 472 ++++++-----
 frontend/src/components/views/WorkerDashboard.jsx            | 435 +++++-----
 frontend/src/context/AppContext.jsx                          |  21 +-
 frontend/src/index.css                                       | 196 +++--
```
21 files, +1684/-1453. She reworked/polished every existing view and layout component (visual/structural pass — spacing, copy, layout tweaks based on the diff sizes) rather than adding new pages. **The `ai_engine/` files in this diff are not her work** — see §4.

## 3. Role-by-role: what exists vs. what `lld.md` §3 says

`AppContext.jsx` `loginAsRole()`:
```js
if (role === 'field_worker') setActiveView('worker_dashboard');
else if (role === 'safety_officer') setActiveView('safety_officer_dashboard');
else if (role === 'corporate_management') setActiveView('corporate_dashboard');
else if (role === 'regulatory_authority') setActiveView('regulatory_dashboard');
else if (role === 'system_admin') setActiveView('admin_dashboard');
else if (role === 'sih_evaluator') setActiveView('sih_evaluator');
```

| File | Role key | Status vs. `lld.md` §3 |
| --- | --- | --- |
| `WorkerDashboard.jsx` (683 lines) | `field_worker` | Name coincidentally close to lld.md's **Worker**, but scope is different — lld.md's Worker is one of *many per mine*, may have no login/phone, does attendance + location ping + inspections. This dashboard is built as a single-user "field worker" view (ticket-reporting focused per mock data), with no attendance/location/phone-less-worker concepts at all — those are net-new lld.md features (§7c/§7d) that don't exist here yet. |
| `SafetyOfficerDashboard.jsx` (739 lines) | `safety_officer` | Matches lld.md's **Mine Safety Officer** in concept. Missing lld.md-specific additions: `Attendance` page (manual check-in/out for phone-less Workers, ping-interval setting), Worker-position map layer, Site-Engineer-work-absorbed ticket assignment (this dashboard's mock data still has `assignedTo: 'Mine Safety Officer'` as a plain string, not a `User._id` reference). |
| `CorporateDashboard.jsx` (484 lines) | `corporate_management` | Matches lld.md's **Corporate Management** — this role survived the RBAC simplification, so this dashboard's premise is still valid. Needs to move off mock data and add the multi-mine EC-cap/penalty aggregation lld.md describes. |
| `RegulatoryDashboard.jsx` (485 lines) | `regulatory_authority` | Matches lld.md's **Regulatory Authority** — also survived. Needs the blockchain hash-verification feature (§7m `AuditLedger` page) which doesn't exist here. |
| `AdminDashboard.jsx` (482 lines) | `system_admin` | Matches lld.md's **Admin** — survived, but scope needs rework: lld.md's Admin does mine/zone onboarding (`Mine.zones` as an *embedded* array, drawn/defined in one form per §7b) and user invites; check whether this dashboard's admin mock data models Zone as a separate top-level thing (it doesn't appear to — mock data only has flat `mineId` strings, no zone concept at all yet, so no embedded-vs-separate conflict exists here — this one may be low-effort to align). |
| `SIHEvaluatorDashboard.jsx` (472 lines) | `sih_evaluator` | **No longer exists in lld.md.** The Evaluator role was explicitly removed and replaced with a guest-login mechanic available on the other 5 roles (`lld.md` §3, "Evaluator removed — replaced by guest login"). This entire file's premise needs to either be deleted, or repurposed as the guest-login *entry flow* (a role picker) rather than a 6th dashboard. |

Also: `Site Engineer` doesn't appear anywhere in the mock data or components — consistent with it never having existed as a separate UI role even under the old `plan.md`, so no cleanup needed there.

## 4. `ai_engine/` changes in this diff — not Navni's work, a rebase artifact

The diff includes changes to `ai_engine/.dockerignore`, `ai_engine/Dockerfile`, `ai_engine/requirements.txt` that are **unrelated to frontend work** and go in the *opposite* direction of `main`'s current state:

- `main`'s `ai_engine/Dockerfile` is currently `python:3.10-slim`, no BuildKit cache mounts, `--extra-index-url` for the CPU torch wheel (this is har2312's regression — see `research/ai_engine_review.md`).
- The `frontend` branch's copy of that same file still has `python:3.12-slim`, BuildKit cache mounts, `--index-url` — i.e., **the version from before har2312's regression landed on `main`**.
- Similarly `requirements.txt`: `main` has `prophet==1.1.5` added back; `frontend` branch doesn't have it, meaning the branch predates the "replace Prophet with linear trend forecasting" commit on `main` too.

This means the `frontend` branch was cut from `main` **before** several recent `ai_engine` commits landed, and has never been rebased/merged back up since. It's not a mistake Navni made in her own work — it's just branch drift — but merging `frontend` into `main` as-is would silently revert `main`'s `ai_engine` Docker fixes unless someone resolves it deliberately (rebase `frontend` onto current `main`, or merge with care on those 3 files).

## 5. Keep vs. rework

**Reusable as-is (or with light touch-up):**
- Visual/layout system: `Header.jsx`, `Sidebar.jsx`, `GlobalSearchModal.jsx`, `NotificationsDrawer.jsx`, `ToastContainer.jsx`, `index.css`, common components (`StatusBadge`, `SummaryCard`, `PageLayout`, `EmptyState`) — these are presentation-layer and mostly role-agnostic. Navni's polish pass on these is real value, not wasted work.
- `CorporateDashboard.jsx`, `RegulatoryDashboard.jsx`, `AdminDashboard.jsx` — roles survived the RBAC change; these need data-layer rework (real API + lld.md's specific fields) but not a conceptual rebuild.

**Needs real rework:**
- `SIHEvaluatorDashboard.jsx` — role doesn't exist anymore; repurpose or delete.
- `WorkerDashboard.jsx` — needs the attendance/location-ping/many-workers-per-mine concepts lld.md §7c/§7d introduce; current version is closer to a single "field inspector" report-submission view.
- `SafetyOfficerDashboard.jsx` — needs the new `Attendance` page and worker-management additions.
- `AppContext.jsx` — the entire `loginAsRole`/`DEMO_USERS` switch needs to move from 6 hardcoded roles to lld.md's 5, and (eventually) from local demo state to real JWT-based auth (§7a).
- Tech stack: no clean path to reuse `zustand`/`echarts`/`leaflet`/`react-router-dom`/`axios` without adding them — they're simply not installed. This is a `package.json` decision to make explicitly with Navni, not a silent addition.
- The dead `App.tsx`/`main.tsx`/`vite-env.d.ts` scaffold — delete, or decide to migrate the live JSX app to TypeScript to match `lld.md` §2's stated stack (`React + Vite + TypeScript`).

**Not urgent / branch hygiene only:**
- Rebase `frontend` onto current `main` before merging, to avoid reverting the `ai_engine` Docker fixes (§4 above).
