from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    mongodb_uri: str
    mongodb_db_name: str
    frontend_url: str

    jwt_secret_key: str
    jwt_algorithm: str
    jwt_expire_minutes: int
    google_client_id: str

    ai_engine_url: str


settings = Settings()
