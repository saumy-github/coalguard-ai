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


settings = Settings()

