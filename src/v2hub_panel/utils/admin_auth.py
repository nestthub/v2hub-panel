"""Admin authentication and authorization helpers."""

from __future__ import annotations

import hashlib
import hmac
import time

from fastapi import HTTPException, Request

from ..config import settings
from ..models.responses import ErrorDetail

TOKEN_EXPIRATION_SECONDS = 3 * 86400  # 3 days


def get_admin_password() -> str | None:
    """Return configured panel password."""
    return getattr(settings, "admin_panel_password", None) or getattr(settings, "panel_password", None)


def generate_admin_token(secret_key: str, expires_in: int = TOKEN_EXPIRATION_SECONDS) -> str:
    """Generate a tamper-proof signed admin token."""
    expires_at = int(time.time()) + expires_in
    msg = f"admin:{expires_at}".encode()
    sig = hmac.new(secret_key.encode(), msg, hashlib.sha256).hexdigest()
    return f"{expires_at}:{sig}"


def verify_admin_token(token: str, secret_key: str) -> bool:
    """Verify signed admin token signature and expiration."""
    try:
        parts = token.split(":")
        if len(parts) != 2:
            return False
        expires_at_str, sig = parts
        expires_at = int(expires_at_str)
        if time.time() > expires_at:
            return False
        msg = f"admin:{expires_at}".encode()
        expected = hmac.new(secret_key.encode(), msg, hashlib.sha256).hexdigest()
        return hmac.compare_digest(sig, expected)
    except Exception:
        return False


def is_admin_authenticated(request: Request) -> bool:
    """Check if request contains valid admin credentials."""
    password = get_admin_password()
    if not password:
        return False

    # 1. Check Authorization Bearer header
    auth_header = request.headers.get("Authorization", "").strip()
    if auth_header.startswith("Bearer "):
        token = auth_header[7:].strip()
        if hmac.compare_digest(token, password) or verify_admin_token(token, password):
            return True

    # 2. Check X-Admin-Secret header
    admin_secret = request.headers.get("X-Admin-Secret", "").strip()
    if admin_secret and (
        hmac.compare_digest(admin_secret, password) or verify_admin_token(admin_secret, password)
    ):
        return True

    # 3. Check Cookie
    cookie_token = request.cookies.get("v2hub_admin_token", "").strip()
    return bool(cookie_token and verify_admin_token(cookie_token, password))


def require_admin(request: Request) -> bool:
    """FastAPI dependency to protect admin endpoints."""
    if not get_admin_password():
        raise HTTPException(
            status_code=503,
            detail=ErrorDetail(
                error="admin_not_configured",
                message="Admin panel password is not configured on this server.",
            ).model_dump(),
        )

    if not is_admin_authenticated(request):
        raise HTTPException(
            status_code=401,
            detail=ErrorDetail(
                error="unauthorized",
                message="Invalid or missing admin credentials.",
            ).model_dump(),
        )

    return True
