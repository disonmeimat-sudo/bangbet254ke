from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "BangBet254 API"
    debug: bool = True

    secret_key: str = "change-this-to-a-long-random-secret"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440

    database_url: str = "sqlite:///./bangbet254.db"

    palpluss_api_key: str = ""
    palpluss_base_url: str = "https://api.palpluss.com"
    palpluss_timeout: float = 30.0
    palpluss_callback_url: str = ""

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",
    )


settings = Settings()
