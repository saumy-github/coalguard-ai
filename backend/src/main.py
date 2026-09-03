from contextlib import asynccontextmanager

from beanie import init_beanie
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient

from .config import settings
from .models import ALL_MODELS
from .routes.auth import router as auth_router
from .routes.users import router as users_router


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
