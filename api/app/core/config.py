from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


# Project root:
# ~/Desktop/bangbet254
BASE_DIR = Path(__file__).resolve().parents[3]

# Backend environment:
# ~/Desktop/bangbet254/backend/.env
BACKEND_ENV = BASE_DIR / "backend" / ".env"


class Settings(BaseSettings):
    app_name: str = "BangBet254 API"
    debug: bool = False

    secret_key: str = "change-this-to-a-long-random-secret"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440

    database_url: str

    palpluss_api_key: str = ""
    palpluss_base_url: str = "https://api.palpluss.com"
    palpluss_timeout: float = 30.0
    palpluss_callback_url: str = ""

    model_config = SettingsConfigDict(
        env_file=str(BACKEND_ENV),
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
