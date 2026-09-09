"""
Mongo connection + Beanie init for the ledger's own `coalguard_ledger` DB.

tz_aware=True on the codec options is not incidental — it is load-bearing.
Raw pymongo/Motor decodes BSON datetimes as NAIVE by default (BSON stores UTC
milliseconds with no tz field attached), and src/canonical.py correctly
REJECTS naive datetimes to prevent a silent 5.5h offset bug. Without this
option, reading back ANY document containing a datetime and trying to hash it
would raise CanonicalizationError on every single attempt — proven by
tests/test_canonical.py::test_survives_a_bson_round_trip, which fails without
it.
"""

from beanie import init_beanie
from bson import CodecOptions
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.database import Database

from .config import settings
from .models import ALL_MODELS


async def connect() -> AsyncIOMotorClient:
    client = AsyncIOMotorClient(settings.mongodb_uri, tz_aware=True)
    database: Database = client.get_database(
        settings.mongodb_db_name,
        codec_options=CodecOptions(tz_aware=True),
    )
    await init_beanie(database=database, document_models=ALL_MODELS)
    return client
