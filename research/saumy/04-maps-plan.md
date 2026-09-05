# Maps — Plan

> **Last updated:** 2026-09-04 (uncommitted — not yet pushed, exists only in this local working tree) ·
**Status:** PLAN — decisions + scope, not yet broken into coding phases. Write a coding-plan file (same relationship as `06-issue-collections-plan.md` → `07-issue-collections-coding-plan.md`) once this is confirmed.

This gets numbered ahead of the issue-collections coding plan because the two are coupled: `PersonIssue`/`SiteIssue` (per `06`) already carry `level`/`section`, but there's currently nowhere to see them — no map, no section picker, nothing. Collecting location data with no way to visualize it makes that data functionally inert for the demo. Build order follows from that, not from any inherent priority of "maps" as a feature.

---

## Recap: three map scopes exist, not one

Established in earlier discussion, restated here since this plan builds on it:

| Scope | Real geodata? | Status today |
|---|---|---|
| **Country/multi-mine map** (Corporate/Regulatory/Admin) | Yes — real lat/lng | Not buildable yet — `Mine` (`backend/src/models/mine.py`) only has `subsidiary_id`/`name` today, no `lat`/`lng` at all. |
| **Single-mine surface map** (`MineMap` page — boundary, EC boundary, hazard pins) | Yes — `Mine.boundary_geojson` | Not buildable yet — same reason, `Mine` has no `boundary_geojson` either. |
| **Underground layout** (`level`/`section`) | No — synthetic, not GPS | **Buildable now** — `PersonIssue`/`SiteIssue` already carry `level`/`section` per `06`. |

**Recommendation**: build the underground view first, for a concrete reason beyond preference — it's the only one of the three where the underlying data model already exists. The other two need `Mine` extended with `lat`/`lng`/`boundary_geojson` first, which is out of scope here (that's `08-domain-models-and-dashboards-plan.md` Phase 1 territory, not touched by this plan).

---

## Decision: `MineLevel` registry — confirmed

The map must show a mine's whole layout even when nothing has been reported yet — so `level`/`section` can't just be values that happen to appear on `PersonIssue`/`SiteIssue` records (that would mean a level/section with zero issues never renders at all). A separate registry is needed, defining the layout independent of any activity data.

- `MineLevel` — `mine_id`, `level` (str, the letter), `section_count` (int). Not a full `Section` document per section; just enough to know "this mine has levels A/B/C, and level A has this many sections" so the UI can render the complete grid and a form can offer a real dropdown. Section *shape*/geometry is explicitly not part of this — sections render as identical placeholder cells, not hand-drawn shapes.
- Seeded directly (`backend/scripts/seed_users.py` or a new small seed step) rather than built with an Admin CRUD UI — matches how `Mine`/`Subsidiary` are already seeded rather than admin-managed today.
- Scoped by `mine_id` from the start, so adding a second mine later is purely inserting more `MineLevel` rows — no schema change, no migration.

**Confirmed seed data for the current demo mine** (three `MineLevel` documents):

| mine_id | level | section_count |
|---|---|---|
| `<the demo mine>` | A | 20 |
| `<the demo mine>` | B | 15 |
| `<the demo mine>` | C | 10 |

---

## Underground view — how it actually renders

**Confirmed approach**: a plain CSS grid, no charting/mapping library. No Leaflet here — Leaflet's whole value is geographic projection and tile layers, irrelevant underground where there's no real coordinate system to project. This is a status-board/floor-plan UI, not a GIS problem:

- A simple React component: levels stacked (one row/section per level, `A` at top per the shallowest-first convention from `06`), each level showing its sections as a grid of numbered cells, count taken from `MineLevel.section_count`.
- Each cell colored/badged by whether there's an **open** `PersonIssue`/`SiteIssue` at that `level`+`section` (`GET /person-issues` + `GET /site-issues` filtered by `mine_id`, grouped client-side by `level`/`section`) — plain data already available once `07`'s Phase 1 (list endpoints) exists.
- Clicking a cell shows the issue(s) there — reuses whatever detail view Phase 1/4 of the issues plan builds, not a new one.

**Reference patterns, not literal libraries to install** — closest real-world analogs, for design inspiration only:
- Parking garage level maps (floors → sections → numbered slots) — the closest structural match to level → section → number. See [Constructing a Data Model for a Parking Lot Management System](https://www.red-gate.com/blog/constructing-a-data-model-for-a-parking-lot-management-system/) and [Parking Lot designs on Dribbble](https://dribbble.com/tags/parking_lot).
- Warehouse rack/location dashboards — closest match for the status-coloring behavior (flagging which locations currently have a problem). See [Warehouse Management System designs on Dribbble](https://dribbble.com/tags/warehouse-management-system).
- Explicitly **not** modeled on seat-map libraries (e.g. [seatmap](https://github.com/ibrahimrahhal/seatmap)) — those solve a harder problem (curved rows, rotation, WebGL rendering) than a flat numbered grid needs.

This replaces `WorkerDashboard.tsx`'s current fake decorative "map" tab (`renderMap`, `components/views/WorkerDashboard.tsx:480`) — that block gets deleted, not extended.

**Not doing yet**: `react-leaflet` stays uninstalled-in-practice (installed as a dependency, unused in code) until the surface/country map work actually starts — no reason to touch it for this scope.

---

## Surface/country maps — explicitly deferred

Both need `Mine.lat`/`lng`/`boundary_geojson`, which don't exist. Not building this now. When it does happen: `react-leaflet` is already in `package.json`, so that part is a non-issue — the blocker is the missing `Mine` fields, not tooling.

---

## Dependency on the issues plan

- The underground view's data comes entirely from `GET /person-issues`/`GET /site-issues` (`07`, Phase 1) — this plan builds no new issue-fetching logic, just a new way to display what Phase 1 already returns.
- Issue-creation forms (`07` Phase 1's `POST /person-issues`/`POST /site-issues`) should pull their `level`/`section` options from `GET /mine-levels/{mine_id}` (new, small endpoint) instead of accepting arbitrary free values — worth reflecting in `07` once a coding-plan pass for maps exists, not changed there yet.

---

## Decisions confirmed

1. `MineLevel` registry — confirmed, per above.
2. Demo mine layout — confirmed: level A = 20 sections, B = 15, C = 10.
3. Underground rendering — confirmed: plain CSS grid, no mapping/charting library, patterned after parking-garage/warehouse-rack dashboards rather than seat-map tools.

## Next step

This needs its own coding-plan file (phases/steps), same relationship as `06` → `07`.
