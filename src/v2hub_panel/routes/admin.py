"""Admin panel and settings endpoints."""

from __future__ import annotations

import hmac
import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, Response

from ..models.admin import (
    AdminLoginRequest,
    AdminLoginResponse,
    AdminStatusResponse,
    UpdateSettingRequest,
)
from ..models.responses import ErrorDetail
from ..services.settings_service import get_settings_service
from ..utils.admin_auth import (
    generate_admin_token,
    get_admin_password,
    is_admin_authenticated,
    require_admin,
)

log = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/status", response_model=AdminStatusResponse)
def get_admin_status(request: Request) -> AdminStatusResponse:
    """Return whether the current request is authenticated and admin is configured."""
    return AdminStatusResponse(
        authenticated=is_admin_authenticated(request),
        admin_configured=bool(get_admin_password()),
    )


@router.post("/login", response_model=AdminLoginResponse)
def admin_login(payload: AdminLoginRequest, response: Response) -> AdminLoginResponse:
    """Authenticate with admin panel password."""
    password = get_admin_password()
    if not password:
        raise HTTPException(
            status_code=503,
            detail=ErrorDetail(
                error="admin_not_configured",
                message="Admin panel password is not configured on this server.",
            ).model_dump(),
        )

    if not hmac.compare_digest(payload.secret, password):
        raise HTTPException(
            status_code=401,
            detail=ErrorDetail(
                error="invalid_credentials",
                message="Invalid admin panel password.",
            ).model_dump(),
        )

    token = generate_admin_token(password)
    response.set_cookie(
        key="v2hub_admin_token",
        value=token,
        max_age=3 * 86400,
        httponly=True,
        secure=True,
        samesite="lax",
    )
    return AdminLoginResponse(ok=True)


@router.post("/logout")
def admin_logout(response: Response) -> dict[str, bool]:
    """Clear admin session cookie."""
    response.delete_cookie(
        key="v2hub_admin_token",
        httponly=True,
        secure=True,
        samesite="lax",
    )
    return {"ok": True}


@router.get("/settings")
def list_settings(_admin: bool = Depends(require_admin)) -> list[dict[str, Any]]:
    """List all registered settings with current values and schema."""
    service = get_settings_service()
    return service.get_all_settings_admin()


@router.put("/settings/{key}")
def update_setting(
    key: str,
    payload: UpdateSettingRequest,
    _admin: bool = Depends(require_admin),
) -> dict[str, Any]:
    """Update a specific setting."""
    service = get_settings_service()
    try:
        return service.update_setting(key, payload.value)
    except KeyError:
        raise HTTPException(
            status_code=404,
            detail=ErrorDetail(
                error="setting_not_found",
                message=f"Setting '{key}' does not exist.",
            ).model_dump(),
        ) from None
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=ErrorDetail(
                error="invalid_setting_value",
                message=str(exc),
            ).model_dump(),
        ) from exc
