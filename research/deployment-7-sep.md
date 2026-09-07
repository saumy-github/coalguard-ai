# Deployment — Open Questions & Options

Discussion-notes file, not a decision — nothing here is confirmed. Deployment was explicitly deferred (2026-09-07) while the Issue-reporting redesign (Section 3) is worked out. Written now so the earlier planning (`research/architecture.md`, 2026-08-26) and today's new considerations (ai_engine model hosting, the `uploads/` folder's persistence requirement) live in one place instead of being re-derived later.

---

## What was already decided before, and still holds

`research/architecture.md` (marked partially superseded, but its own status line says the Docker Compose service list and hosting strategy are still accurate) already worked this out once:

- **Everything except the frontend runs via Docker Compose on a single host**: `backend`, `mongodb`, `redis`, `chromadb`, `ai_engine`, and (if built) `n8n`.
- **Recommended host: Oracle Cloud "Always Free" tier** — an Ampere A1 (ARM) VM, up to 2 OCPUs / 12GB RAM, free forever. Called out specifically because MongoDB + ChromaDB + Python together need more than the 1GB most other free tiers (AWS t2.micro, GCP e2-micro) give you.
- **Fallbacks if Oracle provisioning is unavailable in your region**: GitHub Student Pack credits (Azure $100, no card required) for a temporary VM, or a cheap VPS (Hetzner ~$4/mo, Contabo ~$6/mo) as a last resort.
- **Frontend deploys separately, to Vercel** (free, and Vite/React fits it natively) — it was never meant to live in the same Docker Compose stack, even in production.

**Why this matters for the `uploads/` folder decision made today**: this is a real VM (IaaS), not a container platform (PaaS) — Docker Compose's named volumes (or even a plain host-mounted directory) persist across container restarts and redeploys as long as the VM itself isn't destroyed. So the "keep it simple, `uploads/` folder, decide deployment later" call is safe under this plan specifically *because* it's a VM — it would NOT be safe on something like Render's/Railway's free container tier, where the filesystem is wiped on every redeploy.

## New consideration raised today: Hugging Face

Hugging Face wasn't in the original plan. It's a real option, but for a narrower job than "host everything":

- **Hugging Face Spaces** (free tier) can run a Gradio or FastAPI app, but the free CPU tier sleeps when idle and cold-starts slowly on the next request — workable for a demo-on-request, not a good fit for an always-on backend that other services (n8n, the main backend) depend on synchronously.
- **Realistic use**: host just the heavy ML piece(s) — the YOLO PPE model, or the new LLM text classifier — as their own Space, and have `ai_engine` call out to it over HTTP instead of running the model in-process. This decouples "does the VM have enough RAM/CPU for YOLO + an LLM + Mongo + Chroma all at once" from the VM sizing question above.
- Tradeoff: added latency (network hop) and the cold-start problem above, in exchange for not needing the main VM to carry the ML workload at all.

## Known build risks already found (`research/ai_engine_review.md`), worth resolving before any deploy

- `ai_engine`'s Dockerfile currently risks resolving a GPU/CUDA build of `torch` instead of the intended CPU-only build (`--extra-index-url` instead of `--index-url` — the resolver can silently pick the CUDA-bundled default from PyPI). On a CPU-only VM (Oracle's free ARM tier has no GPU) this would either fail to install or bloat the image with unused CUDA libs.
- Python was rolled back to `3.10-slim` for `ai_engine` while the rest of the repo standardized on `3.12-slim` — a version split across containers with no stated reason.
- BuildKit cache mounts were removed from `ai_engine`'s Dockerfile, so every rebuild reinstalls all `pip`/`apt` packages from scratch — slower CI/deploy cycles, not a correctness issue.

None of these block a first deploy, but they'll make `ai_engine` rebuilds slower and riskier than they need to be — worth fixing before relying on frequent redeploys during the hackathon crunch.

## Open questions — none decided

1. **Which host, concretely**: Oracle Cloud Always Free (first choice per the original plan, but you've never used Oracle before — real onboarding risk/time cost), a student-credit VM, or a cheap VPS?
2. **Does any ML piece move to Hugging Face Spaces**, or does everything stay on the one VM as originally planned? Depends on how heavy the new SiteIssue LLM classifier + the PPE model turn out to be once built.
3. **n8n hosting** (if/when the environmental-confirmation flow from `research/issue-reporting-ai-pipeline-notes-7-sep.md` gets built) — same VM via Docker Compose (as originally planned) or hosted separately?
4. **`uploads/` backup/durability on the VM itself** — a single VM's disk is persistent across restarts, but not against the VM being destroyed/recreated or disk corruption. Not urgent for a hackathon demo, but worth a one-line note if this ever needs to survive past the judging period.
5. **Fix the three ai_engine Dockerfile risks above** before or during the deploy work, not after something breaks in front of judges.
