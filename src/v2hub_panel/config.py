"""Application configuration and settings."""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings with environment variable support."""

    model_config = SettingsConfigDict(
        env_prefix="V2HUB_",
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Application
    app_title: str = "v2hub Mini App"
    app_version: str = "1.0.0"
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] = "INFO"

    # CORS
    cors_origins: list[str] = ["*"]
    cors_allow_credentials: bool = True
    cors_allow_methods: list[str] = ["*"]
    cors_allow_headers: list[str] = ["*"]

    # Paths
    base_dir: Path = Path(__file__).resolve().parent.parent.parent
    frontend_dir: Path = base_dir / "frontend"

    # -----------------------------------------------------------------------
    # Fixed API URL (optional)
    #
    # When set, the frontend will display this URL as read-only and the backend
    # will ALWAYS use it — ignoring any base_url supplied in request bodies.
    # Set via env var:  V2HUB_FIXED_API_URL=https://api.example.com
    # Or hardcode below: fixed_api_url: str | None = "https://api.example.com
    # -----------------------------------------------------------------------
    fixed_api_url: str | None = "https://v2hub.link"

    # -----------------------------------------------------------------------
    # Telegram Mini App auto-fill (optional)
    #
    # When BOTH of these are set, the panel can auto-fill a user's API token
    # on first load, without the user ever pasting it in: it validates the
    # Telegram WebApp initData the frontend sends (proving the request truly
    # comes from that Telegram user, via bot_token), then asks the v2hub
    # server for that user's token via v2hub-admin (via admin_secret_key),
    # creating the account if it doesn't exist yet.
    #
    # Leaving either one unset disables the feature entirely and restores
    # the exact previous behavior: the frontend never calls the new
    # /api/auth/telegram endpoint, and the endpoint itself returns 503 if it
    # is called anyway. No admin access is granted, no initData is ever
    # looked at, and nothing changes for anyone not running inside Telegram.
    #
    # The feature also silently disables itself -- with no exception ever
    # raised -- if the optional v2hub-admin package isn't installed (see
    # pyproject.toml's "telegram-autofill" extra and its use in "dev").
    # telegram_autofill_enabled below is the single source of truth for
    # all of this; every caller (this config, routes/auth.py, and the
    # frontend via GET /api/config) only ever checks that one property.
    # -----------------------------------------------------------------------
    telegram_bot_token: str | None = None
    admin_secret_key: str | None = None

    @property
    def telegram_autofill_enabled(self) -> bool:
        """
        Whether Telegram auto-fill is fully configured AND usable.

        Requires fixed_api_url too, not just the two Telegram-specific
        settings: auto-fill creates/fetches an account via v2hub-admin
        against one specific v2hub server, so there has to be exactly one
        known, trusted server to do that against. In "bring your own
        server" mode (fixed_api_url unset), there's no single server this
        could apply to, so the feature stays off regardless of the other
        two settings.

        Also requires the optional v2hub-admin package to actually be
        installed. This is checked via importlib.util.find_spec rather
        than a real import, specifically so that a missing package can
        never raise ImportError here -- it just makes this property
        (and therefore the whole feature) report itself as disabled.
        """
        if not (self.telegram_bot_token and self.admin_secret_key and self.fixed_api_url):
            return False

        import importlib.util

        return importlib.util.find_spec("v2hub_admin") is not None

    @property
    def frontend_index(self) -> Path:
        """Path to frontend index.html."""
        return self.frontend_dir / "index.html"

    def configure_logging(self) -> None:
        """Configure application logging."""
        logging.basicConfig(
            level=getattr(logging, self.log_level),
            format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        )


settings = Settings()
