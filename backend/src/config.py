from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    mongodb_uri: str = "mongodb://mongodb:27017"
    mongodb_db_name: str = "coalguard"
    frontend_url: str = "http://localhost:5173"

    jwt_secret_key: str = "sih2026-coalguard-super-secret-jwt-key-32chars"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 5256000
    google_client_id: str = "dummy-google-client-id.apps.googleusercontent.com"

    ai_engine_url: str = "http://ai_engine:8000"

    # Blockchain ledger microservice. Defaulted like every other field here so
    # a teammate with no blockchain/.env still boots the backend — the ledger
    # is best-effort by design (see audit_service.py), so a wrong/unreachable
    # URL just means anchors stay unavailable, never a crash at import time.
    blockchain_url: str = "http://blockchain:8000"
    ledger_api_key: str = "change-me-to-a-long-random-string"


settings = Settings()

