# Branch Audit — `main`

> **Last updated:** 2026-09-01 (uncommitted — not yet pushed, exists only in this local working tree) · 
**Status:** CURRENT — audit report

**TL;DR**
- **`research/lld.md` has never been pushed to `main` (or any branch) — it only exists as an untracked file in the local working directory of the `saumy` branch.** This is almost certainly the root cause of the team's coordination problem: teammates building frontend work had no way to see the new design, because it was never shared.
- `main`'s frontend already has a `SIHEvaluatorDashboard.jsx` and role-specific dashboards for Admin/Corporate/Regulatory/Safety Officer/Worker — i.e. it was built against the **old 7-role model** (including "Evaluator", which `lld.md` explicitly removed in favor of guest login). This is on `main` itself, not just the `frontend`/`feature/pwa-mobile-split` branches.
- `backend/` on `main` has only `config.py` and `main.py` — no models, services, or controllers yet. Consistent with the user's own statement that backend coding hasn't started; `docker-compose.yml` and both Dockerfiles exist and are unaffected by the lld.md RBAC/data-model changes (infra layer doesn't encode roles).
- `ai_engine/` on `main` already has real implementation (`cv_engine.py`, `rag_engine.py`, `predictive_engine.py`) — this is har2312's work, already merged to `main` as of commit `48b488c7`, separate from the audit already done in `research/ai_engine_review.md`.

---

## 1. Commit history on `main`

12 commits total (`git log origin/main --oneline`):

```
27b3fa02 build(docker): optimize Dockerfile, update .dockerignore, remove prophet dep
04929a18 fix(ai_engine): replace Prophet with linear trend forecasting to resolve stan backend error
acd356db docs(ai_engine): add comprehensive technical documentation and fix health check logic
1ea18cb1 fix(ai_engine): correct health check status logic, integrate fine-tuned PPE weights
a9697093 chore(ai_engine): remove dataset images from git tracking and add to gitignore
48b488c7 feat(ai_engine): complete ML service with CV PPE, RAG compliance, and predictive analytics
431c8a4e just redeploy
a14f3f4a overall frontend
4858f8fa vercel deployed
1bb49074 research n basic structure
5ca41636 PS csv
865486bf Initial commit
```

Reading top-to-bottom (oldest → newest): initial commit → PS research dropped in → basic repo structure → early frontend deploy to Vercel → **`a14f3f4a overall frontend`** (a full frontend build, see §3) → a redeploy → then five commits that are all `ai_engine` work (CV/RAG/predictive engine, docs, bugfixes, Docker optimization). No backend-model commits exist yet on `main` — matches the user's statement that backend coding hasn't started.

## 2. `research/lld.md` status on `main`

```
$ git show origin/main:research/lld.md
fatal: path 'research/lld.md' exists on disk, but not in 'origin/main'
```

Confirmed: `lld.md` is untracked (`git status --porcelain` shows `?? research/lld.md`) and exists only in the local working tree of the `saumy` branch on this machine. It has never been committed, let alone pushed or merged. **Nobody but the user could have read it.** Whatever Navni and Akshat built, they necessarily built from whatever docs actually existed on the branches they pulled — `research/plan.md` and `research/architecture.md`, both of which describe the old 7-role model.

## 3. Frontend state on `main` (`a14f3f4a overall frontend`)

Full file tree relevant to frontend on `main`:

```
frontend/src/components/views/AdminDashboard.jsx
frontend/src/components/views/CorporateDashboard.jsx
frontend/src/components/views/LandingPage.jsx
frontend/src/components/views/LoginPage.jsx
frontend/src/components/views/RegulatoryDashboard.jsx
frontend/src/components/views/SIHEvaluatorDashboard.jsx
frontend/src/components/views/SafetyOfficerDashboard.jsx
frontend/src/components/views/WorkerDashboard.jsx
```

This is a dashboard-per-role structure, one file per role — and `SIHEvaluatorDashboard.jsx` is present. `lld.md` §3 explicitly removes the Evaluator role in favor of a guest-login mechanic that reuses the other 5 roles' dashboards; a dedicated Evaluator dashboard component doesn't fit that design and would need to be retired or repurposed. Roles represented (Admin, Corporate, Regulatory, Safety Officer, Worker) otherwise line up name-for-name with `lld.md`'s 5 roles — coincidental, since `lld.md` didn't exist when this was built, but worth confirming with whoever wrote this whether "Worker" here already means "many workers per mine, merged with the personnel record" per the new design, or just "the field-level dashboard" in the old Field-Inspector-esque sense. Given `research/plan.md` (the doc that existed at the time) never uses the word "Worker" in its RBAC section (§3.1) — it says "Mine Safety Officer View / Corporate Management View / Regulatory Authority View / Evaluator View" and separately a "Mobile Inspection Application" for field inspectors — the naming match to `lld.md`'s "Worker" role looks like independent convergence, not evidence this dashboard already reflects the new merged-identity model. It should be checked, not assumed.

Also present and worth flagging as pre-existing repo mess (unrelated to the lld.md gap): both `frontend/src/App.jsx` **and** `frontend/src/App.tsx` exist simultaneously, and both `frontend/src/main.jsx` **and** `frontend/src/main.tsx` exist simultaneously. Two parallel entrypoints in the same tree — only one pair can be live depending on what `index.html`/Vite config actually imports; the other is dead weight or a merge artifact.

## 4. Backend state on `main`

```
backend/src/config.py
backend/src/main.py
```

That's the entire backend source tree. No `models/`, `services/`, `controllers/`, `auth/`, or `websockets/` directories exist yet — matches `lld.md` §5's proposed structure not being started. `docker-compose.yml`, `backend/Dockerfile`, and `backend/.dockerignore` exist and are infra-only; nothing in them encodes RBAC roles or the data model, so they're unaffected by the lld.md revision and don't need rework.

## 5. `ai_engine` state on `main`

```
ai_engine/src/cv_engine.py
ai_engine/src/main.py
ai_engine/src/predictive_engine.py
ai_engine/src/rag_engine.py
ai_engine/ingest_rag.py
ai_engine/train_cv.py
```

This is har2312's work and is already merged to `main` (commit `48b488c7` and four follow-up commits). A separate, more detailed audit of this code already exists at `research/ai_engine_review.md` (commissioned earlier by the user) — that report found the fine-tuned PPE model isn't actually loading and flagged a Docker regression; this audit doesn't duplicate that, just confirms it's the same code now sitting on `main`.

## Out of scope, noted in passing
- A file `research/cleanup-plan.md` appeared as untracked in `git status` during this audit — not authored by this task; likely a parallel effort in the same session. Not reviewed here.
