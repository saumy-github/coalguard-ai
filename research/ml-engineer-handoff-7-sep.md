# ML Engineer Handoff — New ai_engine Capabilities Needed

Actionable task list for the ML engineer, as of 2026-09-07. Different purpose from `research/issue-reporting-ai-pipeline-notes-7-sep.md` (that file is internal reasoning/context — why these decisions were made; this file is the work order — what to build and its exact input/output contract). Read the notes file only if you want the deeper "why." The rest of the team will only wire routes/connectivity and very basic glue code on top of whatever you build here — the model/classification logic itself is entirely this list.

**Status**: everything on the backend/frontend side is done and tested — routes, storage, the Admin photo-upload UI, and the Attendance Kiosk page all work and are just waiting on items 1 and 2 below. Item 3 is unscheduled, item 4 is a separate note from the team.

---

## 1. SiteIssue/PersonIssue router + SiteIssue text classifier (new — needed now)

**Goal**: given a worker's free-text description of a problem, decide (a) whether it's a site issue or a person issue, and (b) if it's a site issue, which specific type and severity.

- **Input**: a single string (the free-text description).
- **Output** (JSON):
  ```json
  {"target": "site_issue" | "person_issue", "issue_type": "<literal>", "severity": "<literal>"}
  ```
- **If `target = "site_issue"`**, `issue_type` must be one of: `high_methane`, `high_co`, `low_ventilation`, `high_temperature`, `equipment_fault`, `other`. `severity` must be one of: `NORMAL`, `WARNING`, `CRITICAL`.
- **If `target = "person_issue"`**, `issue_type` must be one of: `no_helmet`, `no_vest`, or `other`. (A safety officer might upload an image and also type "he is not wearing a helmet" in the description, so the AI text classifier must detect these properly from the text). `severity` must be one of: `low`, `medium`, `high`, `critical`.
- **Hard requirement**: if confidence is low, output `"other"` rather than guessing a specific type — never invent a type it isn't reasonably sure of.
- **Reuse, don't replace**: `ai_engine/src/rag_engine.py` already has a working Groq LLM client (`_get_llm()`) used for compliance checking — build this as a new prompt/function using that same client and API key, not a new provider or SDK.
- **Important scoping note**: for the 4 sensor-backed site types (`high_methane`/`high_co`/`low_ventilation`/`high_temperature`), the `severity` this classifier produces is only a provisional guess from text — a separate, already-built endpoint (`/api/predictive/anomaly` in `predictive_engine.py`) is the real authority on severity once real sensor numbers are available for that location. Don't over-invest in tuning this classifier's severity accuracy for those 4 types specifically; getting `issue_type` right matters more than `severity` there.

**Exactly how to expose this, matching the codebase's own pattern:**
- Put the classification function in a **new file**, `ai_engine/src/issue_classifier.py` — same pattern as `rag_engine.py`/`predictive_engine.py` (one module per capability), not added inline.
- Add the route to `ai_engine/src/main.py` the same way every other route there is added — a `@app.post(...)` with a lazy `from src.issue_classifier import classify_issue` import inside the function body (see `rag_check_compliance` at `main.py:234` for the exact shape to copy), wrapped in the same try/except pattern.
- **Route**: `POST /api/issues/classify`, tag `"Issue Classification"`.
- **Request model**:
  ```python
  class IssueClassificationInput(BaseModel):
      observation: str = Field(..., min_length=5, description="Free-text description of the problem.")
  ```
- **Response**: plain JSON matching the `{target, issue_type, severity}` shape above — return a `dataclass` via `asdict(...)`.
- The backend team will call this exact path with this exact request/response shape.

## 2. 1-to-N face search — now unblocked, two consumers, one capability (updated 2026-09-07)

**Goal**: given a photo (a kiosk frame burst, or a person-issue report's photo), identify *which* registered worker it shows — a 1-to-many search, not a 1-to-1 verification.

**No longer blocked**: as of today, an Admin can upload a worker/officer's face photo from the Users page (`PATCH /users/{id}/photo`), which saves it to the shared root `uploads/registered_faces/{user_id}.<ext>` — `{user_id}` is that user's MongoDB `_id` as a string, matching `backend/src/models/user.py`. This is the new, real source of registered faces. The old `ai_engine/data/attendance/registered_faces/` directory and the old `POST /api/attendance/register-face` endpoint are **retired** (the route has been deleted from `ai_engine/src/main.py`) — don't read from or write to that old location.

**Two places this same search needs to plug in:**

**(a) Attendance Kiosk — the urgent one, currently broken end-to-end.** The backend and frontend have already been rewritten for the new kiosk flow (Section 5 Phase 3/4): a shared device (an Officer or Admin logged in) continuously POSTs image-frame bursts to the backend's `POST /attendance/mark`, which forwards only `files` to ai_engine's `POST /api/attendance/mark` and expects back whichever worker was identified. **But `ai_engine/src/main.py:255`'s `attendance_mark` still has the *old* 1-to-1 contract** — it still requires `worker_id`, `latitude`, `longitude`, `site_lat`, `site_lon` as required Form fields and does geofencing + `verify_identity(worker_id=...)` (a 1-to-1 check against one specific worker). Since the caller no longer sends any of those fields, every real attendance-mark attempt fails validation today. This needs to be rewritten to:
  - Drop `worker_id`, `latitude`, `longitude`, `site_lat`, `site_lon` entirely — keep only the `files: List[UploadFile]` burst and `background_tasks`.
  - Drop the geofence check (`is_within_geofence`) — kiosk devices are physically stationed at the mine gate, so there's nothing left to geofence against.
  - Keep the liveness/blink check as-is.
  - Replace `verify_identity(worker_id=...)` (1-to-1) with a 1-to-N search across every file in `uploads/registered_faces/`. That folder is already mounted into the ai_engine container at `/app/uploads` (`docker-compose.yml`'s `ai_engine` service — done, just `docker compose up -d ai_engine` to pick it up if you haven't restarted since pulling this branch).
  - `ai_engine/src/attendance/face_verify.py`'s `REGISTERED_DIR`/`TEMP_SELFIES_DIR` still point at the old `ai_engine/data/attendance/...` paths — repoint both at the shared `/app/uploads/registered_faces` and `/app/uploads/temp_selfies` while you're in this file anyway (matches Section 5 Phase 1's storage-consolidation decision).
  - Return the matched user's Mongo `_id` (parsed straight from the matched filename, e.g. `68abc123....jpg` → `"68abc123...."`) as `"worker_id"` in the response, plus `"selfie_saved"` as before. No `distance_from_site_m` anymore — the backend model that used to store it (`AttendanceRecord`) has been stripped down (Section 5 Phase 2) and no longer has that field.
  - No match / low confidence → same shape as today's "not verified" rejection (401), so the backend's existing error handling doesn't need to change.

**(b) Person-issue offender identification** — same search function, just called on a person-issue report's attached photo instead of a kiosk frame; still genuinely optional (the reporter can type the offender's name in the description text as a fallback) but no longer blocked on missing registered faces either, now that (a)'s registered-faces directory is real and populated.

## 3. `equipment_fault` image classifier (new — not scheduled, flagged as real effort)

**Goal**: given a photo of mining equipment, determine whether it shows a fault and its severity.

**Status**: no existing detector of any kind for this. Standalone future track — bigger effort, not scheduled into any current phase.

## 4. Known bug in already-existing work (fix, not new)

`ai_engine/src/cv_engine.py` looks for fine-tuned PPE weights at `data/models/best.pt`; what actually exists on disk is a directory, `data/models/best/` — the file-existence check fails silently and it falls back to the generic COCO `yolov8n.pt` model at runtime.

**Note from the team:** This discrepancy is because the weights weren't downloaded or placed properly on our end. 
**Action for you:** Please decide on the correct file/folder structure for the model weights, update `cv_engine.py` to match that structure, and then share the proper weights file(s) back with the team so we can place them correctly in our environments.

---

## Already built — no new ML work needed here, just backend wiring

- **PPE detection** (`no_helmet`/`no_vest`) — `cv_engine.py`, works today via `POST /api/cv/detect`.
- **Sensor anomaly severity** (`high_methane`/`high_co`/`low_ventilation`/`high_temperature` + `NORMAL`/`WARNING`/`CRITICAL`) — `predictive_engine.py`, works today via `POST /api/predictive/anomaly`. **Note: This will be touched once the websockets are properly built; until then, do not touch them.**
