from contextlib import asynccontextmanager

from beanie import init_beanie
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from motor.motor_asyncio import AsyncIOMotorClient

from .config import settings
from .models import ALL_MODELS
from .routes.attendance import router as attendance_router
from .routes.audit import router as audit_router
from .routes.auth import router as auth_router
from .routes.issues import router as issues_router
from .routes.mine_levels import router as mine_levels_router
from .routes.mines import router as mines_router
from .routes.person_issues import router as person_issues_router
from .routes.regulatory_reports import router as regulatory_reports_router
from .routes.site_issues import router as site_issues_router
from .routes.users import router as users_router
from .uploads import UPLOADS_ROOT


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.mongo_client = AsyncIOMotorClient(settings.mongodb_uri)
    await init_beanie(
        database=app.state.mongo_client[settings.mongodb_db_name],
        document_models=ALL_MODELS,
    )
    yield
    app.state.mongo_client.close()


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    # FRONTEND_URL may be a comma-separated list (a single value splits to a
    # one-item list, unchanged) so one backend can accept both a localhost
    # dev frontend and one opened from another device on the LAN.
    allow_origins=[o.strip() for o in settings.frontend_url.split(",") if o.strip()],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(users_router)
app.include_router(mine_levels_router)
app.include_router(mines_router)
app.include_router(issues_router)
app.include_router(person_issues_router)
app.include_router(regulatory_reports_router)
app.include_router(site_issues_router)
app.include_router(attendance_router)
app.include_router(audit_router)

app.mount("/uploads", StaticFiles(directory=UPLOADS_ROOT), name="uploads")


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/health/db")
async def health_db():
    try:
        await app.state.mongo_client.admin.command("ping")
        return {"status": "ok", "mongodb": "connected"}
    except Exception as exc:
        return {"status": "error", "mongodb": str(exc)}
