"""
Shared connect/init_beanie helper — every seed script uses this instead of
duplicating the connection setup.
"""

from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient

from src.config import settings
from src.models import ALL_MODELS


async def connect() -> AsyncIOMotorClient:
    client = AsyncIOMotorClient(settings.mongodb_uri)
    await init_beanie(
        database=client[settings.mongodb_db_name],
        document_models=ALL_MODELS,
    )
    return client
