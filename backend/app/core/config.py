from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parents[2]
load_dotenv(BASE_DIR / ".env")


def _parse_bool(value: str | None, *, default: bool = False) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"true", "1", "yes", "on"}


class Settings:
    """Application settings loaded from environment variables."""

    def __init__(self) -> None:
        self.database_url: str = os.getenv("DATABASE_URL", "")
        self.secret_key: str = os.getenv("SECRET_KEY", "")
        self.debug: bool = _parse_bool(os.getenv("DEBUG"), default=False)

        # Redis Configuration
        self.redis_host: str = os.getenv("REDIS_HOST", "localhost")
        self.redis_port: int = int(os.getenv("REDIS_PORT", 6379))
        self.redis_db: int = int(os.getenv("REDIS_DB", 0))
        self.cache_ttl: int = int(os.getenv("CACHE_TTL", 300))


settings = Settings()
