# PersonIssue / SiteIssue — Build Plan

> **Last updated:** 2026-09-04 (uncommitted — not yet pushed, exists only in this local working tree) ·
**Status:** IN PROGRESS — building bottom-up. Deliberately diverges from `research/lld.md` (its `Violation`/`Ticket` design wasn't mature enough to implement as-is) — `lld.md` gets reconciled with whatever actually gets built, once the basic issue-raising system works, not before.

`pillar` is dropped entirely (it was misapplied — meant for physical mine-pillar structures, not a compliance-category enum). `Violation` is replaced by two collections split by scope: **`PersonIssue`** (about one worker) and **`SiteIssue`** (about the mine/an asset, not attributable to one person). `Ticket` (the corrective-action/CAPA workflow) is **deferred entirely for now** — see "Deferred: corrective-action workflow" below.

**Current goal, stated plainly**: build a system that can *raise* an issue — save it, connect it to `ai_engine` where automated detection applies, and view it. Not assignment, not resolution proof, not escalation, not blockchain. Those come later, once this foundation exists and we can see what it actually needs.

**Guiding rule, still in force**: minimal fields only. No speculative fields for edge cases nobody's hit yet. This plan itself is expected to change more than once as the basic build surfaces real requirements — that's normal, not a sign something was planned wrong.

---

## Naming convention (applies project-wide)

- **Collection name**: plural — `person_issues`, `site_issues`. Standard MongoDB/REST convention.
- **Model/class name**: singular — `PersonIssue`, `SiteIssue`. Matches the existing `User` model (`class User(Document)`, `Settings.name = "users"`).
- **Field names**: singular unless the field is literally a list.

---

## Location: `level` + `section`

Two flat top-level fields, not nested into a `location` object:
- `level: str` — a letter (`A`, `B`, `C`, ...), `A` = shallowest, increasing with depth.
- `section: int` — a number (`1`, `2`, `3`, ...) within that level.

No `lat`/`lng` here — no real GPS underground. `lat`/`lng` stays only on `Mine` itself (one coordinate, for the surface/country map).

---

## Unique identifier

Not needed — every Beanie `Document` gets a unique `_id` for free. Only add a separate human-readable code (e.g. `PI-0042`) if you want something short to say/type out loud; that's a display convenience, not a requirement.

---

## How we save issues

Plain Beanie documents in two Mongo collections, `person_issues` and `site_issues` — no separate raw-event log, no intermediate queue. A detection or a manual report is written directly as one document. If that turns out to be insufficient once real volume shows up, that's a scaling problem for later (see Future Scope).

### `PersonIssue`

About one specific worker — PPE non-compliance, unsafe individual behavior, etc.

| Field | Type | Why |
|---|---|---|
| `worker_id` | ref → User, nullable | Which worker this is about. Nullable because a camera-only PPE detection may not resolve identity — YOLOv8 detects "a hardhat is missing," not who's missing it, without a separate face-match. |
| `mine_id` | ref → Mine | Scope for RBAC and dashboard filtering. |
| `level` | str | See above. |
| `section` | int | See above. |
| `issue_type` | str (enum) | Starter set: `no_helmet`, `no_vest`, `unsafe_practice`, `other` — the first two match what the CV model can actually detect today; the rest cover manual reports. Not exhaustive by design. |
| `source` | str (enum: `camera` \| `manual`) | How it was found. |
| `observation` | str | Free-text description — for `camera`, this is the CV engine's own `violation_reason` string; for `manual`, whatever the reporter typed. |
| `photo_url` | str, nullable | Evidence image. |
| `severity` | str | How serious. |
| `status` | str (enum: `open` \| `resolved`) | Lifecycle of this record — see note below on why this now matters more than before. |
| `created_at` | datetime | Timestamp for sorting/audit. |

### `SiteIssue`

About the mine/an asset — not attributable to one person.

| Field | Type | Why |
|---|---|---|
| `mine_id` | ref → Mine | Same as above. |
| `level` | str | Same as above. |
| `section` | int | Same as above. |
| `issue_type` | str (enum) | Starter set: `high_methane`, `high_co`, `low_ventilation`, `high_temperature`, `equipment_fault`, `other` — the first four map to what `ai_engine`'s anomaly detector already checks; the rest cover manual reports. |
| `source` | str (enum: `sensor` \| `manual`) | How it was found. |
| `observation` | str | Free-text description. |
| `sensor_reading_snapshot` | object, nullable | Raw readings at detection time, when `source=sensor`. |
| `severity` | str | Reuse `ai_engine`'s own vocabulary directly — `NORMAL` / `WARNING` / `CRITICAL` — no reason to invent and translate a second scale. |
| `recommended_action` | str | Free text — what to do about it, alarm/evacuation instructions folded in here rather than separate booleans. |
| `status` | str (enum: `open` \| `resolved`) | **Now added, wasn't before** — with `Ticket` deferred, this is the *only* lifecycle tracking `SiteIssue` has. Without it there's no way to tell an active gas reading from one that's since cleared. |
| `created_at` | datetime | Timestamp for sorting/audit. |

**Not included yet, on purpose**: `resolved_by`, `resolution_notes`, `resolution_photo_url` — that's proof-of-fix, which belongs to the corrective-action workflow being deferred below. For now, `status` flips to `resolved` with no further record of who/how. Revisit once that workflow gets designed.

**Still open, your call**:
1. `reported_by` on `PersonIssue` (distinct from `worker_id` — who filed a manual report, vs. who the report is about) — needed, or is `worker_id` enough?
2. A separate human-readable reference code — needed, or is `_id` enough?

---

## How this connects to `ai_engine`

### `PersonIssue` ← `POST /api/cv/detect` (`ai_engine/src/cv_engine.py`)

Returns `total_detections`, `helmet_count`, `vest_count`, `violation_detected` (bool), `violation_reason` (text), `bounding_boxes`, `model_used`.

- **Direct mapping**: `helmet_count == 0` → `issue_type=no_helmet`, `vest_count == 0` → `issue_type=no_vest`; `violation_reason` → `observation`.
- **`backend` has to supply**: `worker_id` (no identity resolution in the CV output at all), `mine_id`/`level`/`section` (comes from the camera `Asset`'s known location — `Asset` needs its own `level`/`section` for this, not built yet), `severity` (no severity concept in the CV output), `photo_url` (the engine returns coordinates over raw bytes, it doesn't store or serve an image — `backend` has to persist that itself).
- **Real limitation**: the model only detects 2 PPE classes — helmet and vest. Anything else (`no_mask`, etc.) only ever arrives via `source=manual`.

### `SiteIssue` ← `POST /api/predictive/anomaly` (`ai_engine/src/predictive_engine.py`)

Returns `overall_risk` (NORMAL/WARNING/CRITICAL), `anomaly_count`, `sensor_reports` (per-sensor breakdown), `isolation_forest_scores`.

- **Direct mapping**: `overall_risk` → `severity`, `sensor_reports` → `sensor_reading_snapshot`.
- **`backend` has to supply**: `mine_id`/`level`/`section` (same `Asset`-location dependency as above), `recommended_action` (the engine only classifies and explains *why* — it never says what to *do*; that mapping, e.g. "CRITICAL methane → evacuate section, sound alarm," is rule logic `backend` has to author itself).
- **First-line flood control, needed even for the basic version**: only write a `SiteIssue` when `overall_risk != NORMAL`. Calling the anomaly endpoint on every telemetry tick and writing a document each time — even for normal readings — would flood the collection immediately once a live telemetry stream exists. This is the minimum filter, not the full answer (see Future Scope).

**Shared dependency**: both paths need `Asset` (camera/sensor) to carry its own `level`/`section` so `backend` can attach a location to an auto-detected issue. Not building this now — flagging it as a prerequisite for the auto-detected path specifically; manual reporting doesn't need it.

---

## Deferred: corrective-action workflow (formerly `Ticket`)

Not decided against — just not needed for the current goal. `PersonIssue`/`SiteIssue` with a `status` field is enough to *raise and track that something is open*. Assignment (`assigned_to`), due dates (`sla_deadline`), proof-of-fix, escalation, and comment threads are all real needs eventually, but designing them now — before the raise/detect/view loop even works — risks building against assumptions that won't survive contact with the actual pipeline. Revisit once `PersonIssue`/`SiteIssue` are live and it's clear what the resolution workflow actually needs to look like.

---

## Rough build sequence (expect this to change)

1. `PersonIssue`/`SiteIssue` Beanie models, as tabled above.
2. Manual creation endpoints (`POST /person-issues`, `POST /site-issues`) — no `ai_engine` wiring yet, fastest path to "a system where we can raise issues."
3. `GET` list endpoints, scoped by `mine_id`.
4. Wire the CV path — `backend` calls `/api/cv/detect`, maps the result per the table above, auto-creates a `PersonIssue`.
5. Wire the anomaly path — same idea for `SiteIssue`, but this depends on a live telemetry source existing first (nothing generates sensor readings yet), so it likely comes after some basic telemetry work, not before.

---

## Future Scope (explicitly not being solved now)

- **Flooding, in general.** The `NORMAL`-filter above is the bare minimum for `SiteIssue`. It doesn't solve: a sensor oscillating right at a threshold (flip-flopping between `WARNING` and `NORMAL` every reading, creating a new issue each flip), a camera re-flagging the same missing-helmet across many consecutive frames of one continuous event, or any other case where one real-world event produces many raw detections. Needs actual design (cooldown windows, "is there already an open issue for this worker/sensor" dedup checks, etc.) once a live detection pipeline actually exists to observe the real failure pattern against — guessing at it now would be designing blind.
- **Corrective-action workflow** (see above) — assignment, resolution proof, SLA/escalation. May or may not come back as a separate `Ticket`-like collection; decide once usage patterns from the basic system are visible.
- **Blockchain audit ledger.** `lld.md` §7m proposed hashing tickets/inspections to a smart contract for tamper-proofing. With `Ticket` deferred and `Violation` replaced, what exactly gets hashed, and when, is completely open — not addressed here.
- **Telemetry/WebSocket pipeline.** Nothing generates live sensor readings yet — `SiteIssue`'s sensor-triggered path can't be wired end-to-end until that exists.
- **`Asset` location** (`level`/`section` on cameras/sensors) — prerequisite for auto-populating an auto-detected issue's location, flagged above, not built.
- **Reconciling `lld.md` and `08-domain-models-and-dashboards-plan.md`** against whatever actually gets built here — planned as a deliberate follow-up pass once the basic system is working, not attempted mid-build.
