from contextlib import asynccontextmanager

from beanie import init_beanie
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient

from .config import settings
from .models import ALL_MODELS
from .routes.auth import router as auth_router
from .routes.mine_assignments import router as mine_assignments_router
from .routes.mine_levels import router as mine_levels_router
from .routes.mines import router as mines_router
from .routes.person_issues import router as person_issues_router
from .routes.regulatory_reports import router as regulatory_reports_router
from .routes.site_issues import router as site_issues_router
from .routes.inspections import router as inspections_router
from .routes.users import router as users_router
from .routes.attendance import router as attendance_router


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
    allow_origins=[settings.frontend_url],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(users_router)
app.include_router(mine_assignments_router)
app.include_router(mine_levels_router)
app.include_router(mines_router)
app.include_router(person_issues_router)
app.include_router(regulatory_reports_router)
app.include_router(site_issues_router)
app.include_router(inspections_router)
app.include_router(attendance_router)


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
