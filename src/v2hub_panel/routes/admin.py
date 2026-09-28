"""Admin panel and settings endpoints."""

from __future__ import annotations

import base64
import hmac
import io
import logging
import time
import uuid
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from PIL import Image

from ..config import settings
from ..models.admin import (
    AdminLoginRequest,
    AdminLoginResponse,
    AdminStatusResponse,
    UpdateSettingRequest,
    UploadImageRequest,
    UploadImageResponse,
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

ALLOWED_IMAGE_FORMATS = {"PNG", "JPEG", "JPG", "WEBP", "GIF"}
MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB


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


@router.post("/upload", response_model=UploadImageResponse)
def upload_image(
    payload: UploadImageRequest,
    _admin: bool = Depends(require_admin),
) -> UploadImageResponse:
    """Upload custom image asset (e.g. background)."""
    raw_data = payload.data.strip()
    if "," in raw_data:
        _, base64_str = raw_data.split(",", 1)
    else:
        base64_str = raw_data

    try:
        image_bytes = base64.b64decode(base64_str)
    except Exception:
        raise HTTPException(
            status_code=400,
            detail=ErrorDetail(
                error="invalid_image_encoding",
                message="Data must be a valid base64-encoded string.",
            ).model_dump(),
        ) from None

    if len(image_bytes) > MAX_IMAGE_SIZE_BYTES:
        raise HTTPException(
            status_code=400,
            detail=ErrorDetail(
                error="file_too_large",
                message=f"File exceeds maximum allowed size of {MAX_IMAGE_SIZE_BYTES // (1024 * 1024)}MB.",
            ).model_dump(),
        )

    try:
        img = Image.open(io.BytesIO(image_bytes))
        img_format = (img.format or "").upper()
        if img_format not in ALLOWED_IMAGE_FORMATS:
            raise HTTPException(
                status_code=400,
                detail=ErrorDetail(
                    error="unsupported_format",
                    message=f"Unsupported format '{img_format}'. Allowed: {', '.join(sorted(ALLOWED_IMAGE_FORMATS))}.",
                ).model_dump(),
            )
        img.verify()
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail=ErrorDetail(
                error="invalid_image_file",
                message="Uploaded file is not a valid image.",
            ).model_dump(),
        ) from exc

    # Determine file extension
    ext = Path(payload.filename).suffix.lower()
    if not ext or ext.lstrip(".") not in [f.lower() for f in ALLOWED_IMAGE_FORMATS]:
        ext = f".{img_format.lower()}"

    settings.uploads_directory.mkdir(parents=True, exist_ok=True)
    filename = f"bg_{int(time.time())}_{uuid.uuid4().hex[:8]}{ext}"
    dest_path = settings.uploads_directory / filename
    dest_path.write_bytes(image_bytes)

    return UploadImageResponse(url=f"/uploads/{filename}")
