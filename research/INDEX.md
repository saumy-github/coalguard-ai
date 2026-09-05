# Research Docs Index

> Tracks every markdown file under `research/`. Status reflects what's actually true as of the date below — not necessarily each file's own self-reported header, which can go stale once later work supersedes it. Update this table whenever a tracked file's status changes materially (superseded, executed, deferred, etc.) — don't let it drift the way the docs themselves used to.

**Last updated:** 2026-09-06

| Name | Location | Last Updated | Status |
|---|---|---|---|
| 11_per_platform_dataset_search.md | `research/` | 2026-08-23 | HISTORICAL / REFERENCE ONLY — pre-lock-in PS survey, before PS 26024 was chosen |
| ai_engine_review.md | `research/` | 2026-09-01 | CURRENT — point-in-time audit report of `ai_engine`, still the latest one |
| architecture.md | `research/` | 2026-08-26 | PARTIALLY SUPERSEDED — Docker/hosting strategy still broadly accurate; RBAC/data-model specifics superseded by `lld.md` |
| blockchain_ledger.md | `research/` | 2026-08-26 | DESIGN ONLY, NOT BUILT — the audit-ledger design; explicitly deferred to backlog by `saumy/09`'s Decision #13 trim (Phase 7) |
| branch-audit-frontend.md | `research/` | 2026-09-01 | DELETED (2026-09-06) |
| branch-audit-main.md | `research/` | 2026-09-01 | DELETED (2026-09-06) |
| branch-audit-pwa-mobile.md | `research/` | 2026-09-01 | DELETED (2026-09-06) |
| cleanup-plan.md | `research/` | 2026-09-02 | CURRENT (per its own header) — git/team workflow agreement; predates the `saumy/09`–`10` restructuring, not re-verified against it |
| lld.md | `research/` | 2026-09-06 | CURRENT — reconciled in place: sections/fields that were actually built (or superseded, like `Violation`→`PersonIssue`/`SiteIssue`) are updated to match reality and marked ✅; everything still unbuilt (attendance, telemetry, CAPA tickets, blockchain, OCR, n8n, etc.) is kept exactly as originally designed, not removed — it's still the target |
| plan.md | `research/` | 2026-08-26 | DELETED (2026-09-06) |
| prev_ps.md | `research/` | 2026-08-26 | HISTORICAL / REFERENCE ONLY — pre-lock-in strategic research |
| saumy/01-auth-completion-plan.md | `research/saumy/` | 2026-09-02 | DONE — Phases 1–7 and 9–12 executed and verified; Phase 8 explicitly not started |
| saumy/02-google-auth-deferred.md | `research/saumy/` | 2026-09-02 | CURRENT — active scope decision, Google login still built but disabled by a flag |
| saumy/03-ai-engine-docker-workflow-plan.md | `research/saumy/` | 2026-09-02 | PLAN — awaiting review (per its own header; not verified executed this session) |
| saumy/04-maps-plan.md | `research/saumy/` | 2026-09-04 | DONE — implemented; the Mine Map is live and in active use |
| saumy/05-maps-coding-plan.md | `research/saumy/` | 2026-09-04 | DONE — implemented |
| saumy/06-issue-collections-plan.md | `research/saumy/` | 2026-09-04 | DONE — `PersonIssue`/`SiteIssue` are live and used throughout the app |
| saumy/07-issue-collections-coding-plan.md | `research/saumy/` | 2026-09-04 | DONE — all phases executed |
| saumy/08-domain-models-and-dashboards-plan.md | `research/saumy/` | 2026-09-03 | SUPERSEDED by `saumy/09`–`10` — the real-data/dashboard replacement work was redone more completely there |
| saumy/09-changes-5-sep.md | `research/saumy/` | 2026-09-06 | MOSTLY DONE — Decisions #1–16 (+#17 addendum) implemented via `10`'s Phases 0–9, `lld.md` reconciled separately (see `research/lld.md`); the future `regulator_assignments` collection remains open/deferred |
| saumy/10-frontend-coding-plan.md | `research/saumy/` | 2026-09-06 | DONE — Phases 0–9 all implemented and verified (`tsc`/`vite build`/live checks), including the `lld.md` reconciliation (done separately as a full rewrite, not as a Phase 9 sub-step) |
