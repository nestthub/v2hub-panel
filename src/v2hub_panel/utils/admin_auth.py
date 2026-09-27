"""Admin authentication and authorization helpers."""

from __future__ import annotations

import hashlib
import hmac
import time

from fastapi import HTTPException, Request

from ..config import settings
from ..models.responses import ErrorDetail

TOKEN_EXPIRATION_SECONDS = 7 * 86400  # 7 days


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
    secret_key = settings.admin_secret_key
    if not secret_key:
        return False

    # 1. Check Authorization Bearer header
    auth_header = request.headers.get("Authorization", "").strip()
    if auth_header.startswith("Bearer "):
        token = auth_header[7:].strip()
        if token == secret_key or verify_admin_token(token, secret_key):
            return True

    # 2. Check X-Admin-Secret header
    admin_secret = request.headers.get("X-Admin-Secret", "").strip()
    if admin_secret and (
        admin_secret == secret_key or verify_admin_token(admin_secret, secret_key)
    ):
        return True

    # 3. Check Cookie
    cookie_token = request.cookies.get("v2hub_admin_token", "").strip()
    return bool(cookie_token and verify_admin_token(cookie_token, secret_key))


def require_admin(request: Request) -> bool:
    """FastAPI dependency to protect admin endpoints."""
    if not settings.admin_secret_key:
        raise HTTPException(
            status_code=503,
            detail=ErrorDetail(
                error="admin_not_configured",
                message="Admin secret key is not configured on this server.",
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
