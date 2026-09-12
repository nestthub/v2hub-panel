"""Connection and health endpoints."""

from __future__ import annotations

from fastapi import APIRouter

from ..config import settings

router = APIRouter(prefix="/api", tags=["system"])


@router.get("/config")
def get_frontend_config() -> dict[str, str | bool | None]:
    """
    Expose server-side config to the frontend.
    The frontend reads this on startup to know whether API URL is fixed,
    and whether Telegram Mini App token auto-fill is available at all —
    so it can skip even attempting auto-fill (no request, no initData
    read) on deployments that haven't configured it.
    """
    return {
        "fixed_api_url": settings.fixed_api_url,
        "telegram_autofill_enabled": settings.telegram_autofill_enabled,
    }


@router.get("/health")
def health() -> dict[str, bool]:
    """Health check endpoint for load balancers and uptime monitors."""
    return {"ok": True}
