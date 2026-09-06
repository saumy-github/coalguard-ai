# Planning Conventions

Rules for how `research/feature-audit-6-sep.md` and `research/implementation-plan-6-sep.md` (and any similar pair going forward) get written and maintained. Established through direct correction during the 2026-09-06 planning session — write down here so they don't need to be repeated.

---

## The two-file split

- **The audit file is the decisions register**: what's actually built today (ground truth, verified from code), and what we've decided to change and why.
- **The implementation file is the execution order**: phases and concrete steps, plus the full ripple-effect impact of each change — which files, which layers, which other consumers.
- Don't duplicate detail across them. The audit file states a decision and its reasoning once; the implementation file carries the step-by-step and the impact list. Each points at the other rather than repeating it.

## Never write to either file without being told to

Discussion, options, and open questions happen in chat first. A file only gets written or edited when explicitly told to — not as soon as something is "clear enough" to write. This applies to *new* content and to *edits* of already-written content equally.

## Don't remove or change the ground-truth research content

The audit file's per-feature sections (what's actually built, verified from code) are research findings, not drafts — never alter or delete them. Everything from a discussion — decisions, corrections, scope changes — goes into that section's own **"Changes Planned"** heading, added underneath, never edited into the research text itself.

## Only write confirmed decisions, phased into steps

The implementation file only contains what's actually been confirmed — never a decision that's still under discussion or an option being weighed. When a section has nothing confirmed yet, it stays an explicit placeholder ("no confirmed decisions yet") rather than a guess at what might get decided. Once something is confirmed, it's broken into **phases**, and each phase into **numbered steps** — not a paragraph description of the change.

## Verify ripple effects across all three layers before writing them down

A change to one layer (usually the backend model) routinely has real consequences in the other two — don't assume a layer is unaffected, and don't approximate which files need to change. Grep/read the actual code for every real consumer before writing an impact list, the same way the original audit was built from code, not memory. Explicitly note what's *confirmed unaffected* too (e.g. ai_engine having zero involvement in a User-model change, or `issue.mine_id` being an unrelated field to `user.mine_ids`) — a verified negative is as useful as a verified positive, and prevents the same ground getting re-checked later.

## Questions go in chat as plain text, not a selection tool

When something needs the user's input, ask directly in chat as `q1) <question> <options>` — not via a multiple-choice tool. The user types the answer back in the same space rather than clicking an option.

## Don't silently decide ambiguous design points

If there's a genuine choice to make and no explicit instruction covers it, surface it as a question rather than picking one side and writing it down as settled. This includes noticing when a *newly confirmed* decision creates a *new*, previously-unconsidered ambiguity (e.g., confirming profile classes carry `mine`/`mines` immediately raised "how does Pydantic tell `WorkerProfile` apart from `OfficerProfile`?" — that got asked, not assumed).

## "Superseded" is reserved for changes to real, already-built code

If a plan is revised before any code exists for it, that's not a supersession — it's just the plan changing. Write the current decision directly and cleanly, as if it were always the plan; don't narrate "originally we said X, now instead Y." That framing is only correct once actual code/behavior existed and is now being changed on top of something real.

## Chat-only shorthand never leaks into files or code

Abbreviations adopted purely to type less in conversation (e.g. "officer" for `safety_officer`, "corporate" for `corporate_manager`) stay in chat. Files and code always use the real, full identifier.

## Don't record problems about features that were never built

If something raised as a "problem" turns out to trace back to a feature that was only ever discussed/planned and never actually coded (confirmed by grep/search, not assumption), it doesn't get written up as an open problem to solve — note that it's closed out so the confusion doesn't resurface, and move on.
