# ML Engineer Handoff — New ai_engine Capabilities Needed

Actionable task list for the ML engineer, as of 2026-09-07. Different purpose from `research/issue-reporting-ai-pipeline-notes-7-sep.md` (that file is internal reasoning/context — why these decisions were made; this file is the work order — what to build and its exact input/output contract). Read the notes file only if you want the deeper "why." The rest of the team will only wire routes/connectivity and very basic glue code on top of whatever you build here — the model/classification logic itself is entirely this list.

---

## 1. SiteIssue/PersonIssue router + SiteIssue text classifier (new — needed now)

**Goal**: given a worker's free-text description of a problem, decide (a) whether it's a site issue or a person issue, and (b) if it's a site issue, which specific type and severity.

- **Input**: a single string (the free-text description).
- **Output** (JSON):
  ```json
  {"target": "site_issue" | "person_issue", "issue_type": "<literal>", "severity": "<literal>"}
  ```
- **If `target = "site_issue"`**, `issue_type` must be one of: `high_methane`, `high_co`, `low_ventilation`, `high_temperature`, `equipment_fault`, `other`. `severity` must be one of: `NORMAL`, `WARNING`, `CRITICAL`.
- **If `target = "person_issue"`**, this classifier only needs to run when a photo isn't available or the existing PPE detector (see "already built" below) didn't resolve it — `issue_type` in that case is just `other` (person-issue types beyond `no_helmet`/`no_vest` aren't classified from text right now). `severity` must be one of: `low`, `medium`, `high`, `critical`.
- **Hard requirement**: if confidence is low, output `"other"` rather than guessing a specific type — never invent a type it isn't reasonably sure of.
- **Reuse, don't replace**: `ai_engine/src/rag_engine.py` already has a working Groq LLM client (`_get_llm()`) used for compliance checking — build this as a new prompt/function using that same client and API key, not a new provider or SDK.
- **Important scoping note**: for the 4 sensor-backed site types (`high_methane`/`high_co`/`low_ventilation`/`high_temperature`), the `severity` this classifier produces is only a provisional guess from text — a separate, already-built endpoint (`/api/predictive/anomaly` in `predictive_engine.py`) is the real authority on severity once real sensor numbers are available for that location. Don't over-invest in tuning this classifier's severity accuracy for those 4 types specifically; getting `issue_type` right matters more than `severity` there.

**Exactly how to expose this, matching the existing codebase's own pattern (don't invent a different one):**
- Put the classification function in a **new file**, `ai_engine/src/issue_classifier.py` — same pattern as `rag_engine.py`/`predictive_engine.py` (one module per capability), not added inline into an existing file.
- Add the route to `ai_engine/src/main.py` the same way every other route there is added — a `@app.post(...)` with a lazy `from src.issue_classifier import classify_issue` import inside the function body (see `rag_check_compliance` at `main.py:234` for the exact shape to copy), wrapped in the same try/except → `logger.error(...)` → `HTTPException(status_code=500, ...)` pattern.
- **Route**: `POST /api/issues/classify`, tag `"Issue Classification"`.
- **Request model** (a `pydantic.BaseModel`, same style as `ComplianceInput`/`TelemetryInput`):
  ```python
  class IssueClassificationInput(BaseModel):
      observation: str = Field(..., min_length=5, description="Free-text description of the problem.")
  ```
- **Response**: plain JSON matching the `{target, issue_type, severity}` shape above — return a `dataclass` via `asdict(...)`, same convention as every other endpoint in `main.py` (`ComplianceResult`, `CVDetectionResult`, etc.), not a raw dict literal.
- The backend team will call this exact path with this exact request/response shape — if the final shape ends up different once you've built it, flag it back rather than silently diverging, since `backend/src/services/ai_engine_client.py` is written against this contract.

## 2. Person-issue offender identification (new — blocked on a prerequisite, not yet actionable)

**Goal**: given a photo attached to a person-issue report, identify *which* registered worker appears in it — a 1-to-many face search, not a 1-to-1 verification.

**Blocked**: worker face registration isn't populated anywhere in the app today — `ai_engine/data/attendance/registered_faces/` is empty (verified — only a `.gitkeep`), and nothing in the frontend calls the existing `POST /attendance/register-face` endpoint. There's nothing to search against yet. This needs the registration flow built/used first (a separate, existing-feature gap, not part of this task) before this item can produce real results.

**Not your problem to solve**: the reporter can also just type the offender's name in their description text — that's an already-agreed product-level fallback, not something requiring ML work.

## 3. `equipment_fault` image classifier (new — not scheduled, flagged as real effort)

**Goal**: given a photo of mining equipment, determine whether it shows a fault and its severity.

**Status**: no existing detector of any kind for this. Standalone future track — bigger effort than the two items above, not scheduled into any current phase.

## 4. Known bug in already-existing work (fix, not new)

`ai_engine/src/cv_engine.py` looks for fine-tuned PPE weights at `data/models/best.pt`; what actually exists on disk is a *directory*, `data/models/best/` — the file-existence check fails silently and it falls back to the generic COCO `yolov8n.pt` model at runtime. Worth a fix pass, since PPE detection has effectively never been running on the real fine-tuned model.

---

## Already built — no new ML work needed here, just backend wiring

- **PPE detection** (`no_helmet`/`no_vest`) — `cv_engine.py`, works today via `POST /api/cv/detect`.
- **Sensor anomaly severity** (`high_methane`/`high_co`/`low_ventilation`/`high_temperature` + `NORMAL`/`WARNING`/`CRITICAL`) — `predictive_engine.py`, works today via `POST /api/predictive/anomaly`. Just needs live sensor data actually reaching it (a product/infra gap, not an ML one).
