"""Configuration settings for the Cookibud API."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Settings for fastAPI"""

    secret_key: str = "secret"  # Used to decode and encode JWT
    algorithm: str = "HS256"
    adapter: str = "in_memory"
    mongo_uri: str = "mongodb://localhost:27017/"
    frontend_url: str = "http://localhost:5173"

    model_config = SettingsConfigDict(env_file=".env")


settings = Settings()
