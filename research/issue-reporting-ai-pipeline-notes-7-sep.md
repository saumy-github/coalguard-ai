# Issue Reporting → AI Classification Pipeline — Discussion Notes

Discussion-notes file, not a decisions/plan file — captures the reasoning behind the unified Issue-reporting redesign and the environmental-confirmation idea for Section 3. The unified-endpoint/durability design below is confirmed (see `feature-audit-6-sep.md` Section 3's Changes Planned for the terse decision record); the n8n/sensor-confirmation flow is explicitly exploratory — an idea to build toward later, not scheduled or phased.

---

## Why the two manual creation endpoints are being replaced with one

Today a human picks the issue type/severity themselves (`WorkerDashboard.tsx`'s report form has literal "ISSUE TYPE"/"SEVERITY" dropdowns) and the frontend calls whichever of `POST /site-issues` / `POST /person-issues` matches. The new design inverts this: the human only describes the problem (+ optional photo); the AI decides both *which collection it belongs in* (person vs. site) and *which specific type* it is. That means a single submission endpoint, not two — the caller doesn't know the destination collection until after classification.

## Why a `raw_issue_reports` durability collection, not a job queue

The requirement was: don't lose a report if the backend or the AI engine is unavailable while processing it. Two different failure surfaces, two different existing mechanisms cover them without new infrastructure:

- **Backend unreachable from the client** — already solved for Inspections via IndexedDB + `useSyncManager.ts` (queue locally, sync automatically on reconnect). The new unified endpoint is just a new payload type on that same existing mechanism, not a new one.
- **AI engine unreachable *after* the backend has received the report** — this is the actual new problem. Solution: persist a raw record (`{source_id, mine_id, level, section, observation, photo_path, status, created_at}`) and save the photo to `uploads/pending/` **before** calling the AI engine at all. If the AI call fails, the raw record and its photo simply stay on disk/in Mongo with `status: "failed"` — nothing was ever at risk of being lost, because nothing depended on the AI call succeeding to be durable. On success, the real `SiteIssue`/`PersonIssue` is created, the photo is moved into its final `uploads/site_issues/` or `uploads/person_issues/` folder, and the raw record is deleted (confirmed — no audit trail kept once resolved).

This was chosen over a message queue (Celery/RQ/etc.) as deliberately the smaller mechanism for a hackathon timeline — a single extra collection plus a status field, no new moving service.

## Why PersonIssue's manual flow needed no new AI work, but SiteIssue's does

`cv_engine`'s YOLOv8 model already reliably detects exactly 2 classes — `Safety-Helmet`, `Reflective-Jacket` (`cv_engine.py:39-42`) — which map directly onto 2 of `PersonIssueType`'s 3 values. So the manual PersonIssue path was scoped down to exactly what's already detectable (`no_helmet`/`no_vest`, photo-driven, reusing the existing `/api/cv/detect` endpoint as-is), with `unsafe_practice` dropped entirely — no detector exists for it and none is planned right now. `other` stays as the fallback for anything the classifier can't confidently place into the two known classes.

`SiteIssueType`'s first 4 values (`high_methane`, `high_co`, `low_ventilation`, `high_temperature`) *do* have a working detector (`predictive_engine.assess_anomaly`) — but it only accepts **numeric sensor telemetry**, never text or an image. There is no existing classifier of any kind that can look at a text description ("unusual gas odor near Face 4B fan") and produce one of these types. So unlike PersonIssue, SiteIssue's manual flow needs a genuinely new capability: an LLM text classifier (reusing the Groq LLM plumbing already built in `rag_engine.py` — same `_get_llm()` singleton, a new prompt) that reads the description and picks one of the 6 `SiteIssueType` literals + a severity, with `other` as the fallback. This same call doubles as the person-vs-site routing decision for the unified endpoint — one new classifier, two jobs, not two separate models.

`equipment_fault` is a third, unrelated future track: identifying it from a photo of the equipment itself, which would need a dedicated vision model (acknowledged as real effort, not scoped now). It doesn't affect the text-classifier work above.

## The environmental-issue confirmation idea (exploratory — not decided, not scheduled)

Proposed flow for the 4 sensor-backed `SiteIssueType`s specifically:

1. Worker describes a problem in text. The new LLM classifier reads it and produces a *candidate* hypothesis (e.g., "sounds like it could be high methane") — treated as a guess, not a verdict, since text alone can't reliably carry a severity.
2. That candidate triggers an **n8n workflow** (webhook call from the backend) carrying `{mine_id, level, section, suspected_type, raw_report_id}`.
3. The n8n workflow looks up the *current* sensor reading for that exact location and calls the already-existing `/api/predictive/anomaly` endpoint with those real numbers — this is the actual, reliable verdict (severity + confirmed/not), not the LLM's guess.
4. n8n calls back into a new backend webhook endpoint with the result; the backend finalizes the pending `raw_issue_reports` entry into a real `SiteIssue` (or discards it if sensors show `NORMAL` — false alarm).

Why n8n specifically: this is a multi-step, potentially-waiting pipeline (LLM → sensor lookup → second AI call → callback) that will get iterated on a lot; a visual workflow tool beats hand-rolling retry/branching logic in FastAPI while the design is still moving, and it can self-host as one more `docker-compose.yml` service alongside redis/chromadb.

**What doesn't exist yet and would be needed before this could be built:**
- **Live sensor ingestion.** Today, sensor numbers only ever arrive as parameters someone passes directly into `/site-issues/detect` — there is no pipeline anywhere that continuously receives real sensor data. This is the websocket work already flagged as future (see `location-and-pwa-notes-7-sep.md` for the related checkpoint-location discussion) — it would need to land somewhere fast to query, e.g. Redis (already in the stack) caching "latest reading per mine/level/section."
- **A "no recent data for this location" fallback.** If a section has no sensors, or the last reading is stale, there's nothing to confirm against — this case needs to fall to a human (safety officer) reviewing an unconfirmed candidate, rather than silently dropping the report.
- **The webhook pair itself** — a trigger point in the backend's classification code that calls n8n, and a new callback endpoint on the backend for n8n to report back into.
- **A timing decision**, deferred until sensor ingestion actually exists: does the initial API call block until confirmation completes (fine if cached/instant), or does the frontend get an interim "verifying..." state with a later async update?

None of the above is being built now — captured here so the reasoning isn't lost before Section 3 gets a real phased implementation pass.
