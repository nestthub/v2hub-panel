"""Connection and health endpoints."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter

from ..config import settings
from ..services.settings_service import get_settings_service

router = APIRouter(prefix="/api", tags=["system"])


@router.get("/config")
def get_frontend_config() -> dict[str, Any]:
    """
    Expose server-side config to the frontend.
    The frontend reads this on startup to know whether API URL is fixed,
    whether Telegram Mini App token auto-fill is available at all,
    and public panel settings (e.g. default background).
    """
    return {
        "fixed_api_url": settings.fixed_api_url,
        "telegram_autofill_enabled": settings.telegram_autofill_enabled,
        "app_version": settings.app_version,
        "settings": get_settings_service().get_public_settings(),
    }


@router.get("/settings/public")
def get_public_settings() -> dict[str, Any]:
    """Return public panel settings for clients."""
    return get_settings_service().get_public_settings()


@router.get("/health")
def health() -> dict[str, bool]:
    """Health check endpoint for load balancers and uptime monitors."""
    return {"ok": True}
