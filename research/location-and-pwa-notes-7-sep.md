# Location Tracking & PWA — Discussion Notes

Discussion-notes file, not a decisions/plan file — this captures the reasoning behind Section 2's location-tracking direction and the current PWA status, since it's substantial enough to deserve its own space rather than living inline in `feature-audit-6-sep.md`. Nothing here is executed; the one real open item (who performs a section check-in) is explicitly deferred, not decided.

---

## Why real GPS doesn't work for in-mine location

GPS requires a clear line of sight to satellites — it does not function underground. This isn't a limitation of our app, it's physical. Real mine safety-tracking systems don't try to get continuous coordinates inside a mine; they use RFID/Bluetooth beacon checkpoints at section/junction entrances, so what's actually known at any time is "the last checkpoint this worker's badge passed," not a live position.

That maps directly onto data we already have: `level` + `section` — the same pair `PersonIssue`/`SiteIssue` already use to localize an issue. So "location inside the mine" should be modeled as a **checkpoint** (current level + section), not a coordinate.

## The checkpoint model

- A worker's "location" = their `current_level` + `current_section`, updated by a real check-in action, not derived from GPS.
- **Open, deliberately deferred**: who performs that check-in — the worker themselves (a simple "update my section" control) or their Safety Officer setting it for them. Not decided; revisit when Section 2 gets formalized.
- For the map: a worker's position renders at their current section's polygon (once Section 2's persisted-diagram approach lands — see `feature-audit-6-sep.md`/`implementation-plan-6-sep.md`), not a raw coordinate plotted on anything.
- For the demo specifically (a worker's marker visibly moving section to section over time): treat that as an explicitly separate, demo-only mechanism (e.g. a scripted interval walking the value forward) — not conflated with the real check-in feature's logic.

## Offline behavior — two different things that sound like one

- **A device always knows its own last-set section instantly, with zero network involved.** That's just local state (a value in `localStorage`/IndexedDB the moment it's set) — not really "offline tracking," since no connectivity was ever needed for a phone to know what it itself last did.
- **Anyone else seeing that location requires it to have reached the server.** This cannot work offline, by definition — if a device hasn't synced, no other device can know its state yet, offline or not.
- **Concrete mechanism, already proven**: the exact same offline-queue pattern already built for Inspections (`frontend/src/utils/db.ts` + `frontend/src/hooks/useSyncManager.ts`) — capture the section-change locally, queue it, sync automatically once connectivity returns. Not new infrastructure, a new payload type on existing infrastructure.
- **Reports filed offline can carry the device's own last-known section directly** — since it's the device's own recent local state, no round-trip to the server is needed to attach it to a queued report.

## Feeds directly into issue reporting

Once a worker has a `current_level`/`current_section`, the report form (today: level/section typed manually every time on `WorkerReportPage`) can pre-fill both from the worker's current checkpoint, still editable if the actual issue is elsewhere. No new location mechanism needed beyond the checkpoint model above — this is pure reuse.

## Why Attendance stays untouched

Attendance already captures real GPS lat/lng today, checked via Haversine against the mine's surface coordinates (100m geofence) — correct as-is, because clocking in happens at the surface (entrance/lamp room), where GPS genuinely works. That's a different event from being in a specific section underground, which hasn't happened yet at the moment someone clocks in. Level/section does not belong at attendance time.

## Current state of geolocation in this codebase — verified, not assumed

- `frontend/src/hooks/useGeolocation.ts` uses the **plain native browser Geolocation API** (`navigator.geolocation.watchPosition`) — confirmed by reading the file directly. **No third-party library at all.**
- It continuously watches position while mounted, but only whatever's current in state gets read at submit time — a single snapshot, not a track.
- Today it has exactly one consumer: `ObservationForm.tsx` (Inspections). That snapshot's `lat`/`lng` gets bundled into the same payload as the photo/description/voice note and saved together as one `Observation`.

## Can a PWA ask for camera/location permission?

Yes — but this is a broader fact than "PWA-specific": **camera (`navigator.mediaDevices.getUserMedia`) and location (`navigator.geolocation`) are plain Web APIs**, available in any browser tab, installed-as-PWA or not. This is already proven working in this exact codebase — `MarkAttendanceModal` requests live camera access for the attendance burst-capture, and `useGeolocation.ts` requests location, both via a normal browser permission prompt, with zero PWA infrastructure behind either one.

## This app is not currently a configured PWA — verified, not assumed

Checked directly: **no `manifest.json`, no service worker, no `vite-plugin-pwa`** anywhere in `frontend/`. This is a regular web app that happens to use one offline-friendly pattern (IndexedDB) for Inspections — the existing offline queue works only because the tab stays open with `navigator.onLine` listeners, not because of a service worker enabling background sync.

Becoming a real installable PWA (home-screen icon, offline resilience even when the tab isn't open) is a separate, genuinely substantial piece of work (e.g. adding `vite-plugin-pwa` + a manifest + a service worker) — not a prerequisite for anything discussed above, and not scoped into Section 2 unless explicitly requested later.
