"""Request and response models for admin panel and settings."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class AdminLoginRequest(BaseModel):
    """Payload to log in to the admin panel."""

    secret: str = Field(..., min_length=1, description="Admin secret key")


class AdminLoginResponse(BaseModel):
    """Successful admin login response."""

    ok: bool = True
    token: str = Field(..., description="Signed admin session token")


class AdminStatusResponse(BaseModel):
    """Status of admin configuration and current session."""

    authenticated: bool
    admin_configured: bool


class UpdateSettingRequest(BaseModel):
    """Request to update a registered setting."""

    value: Any = Field(..., description="New setting value")


class UploadImageRequest(BaseModel):
    """Base64 image upload request."""

    filename: str = Field(..., min_length=1, description="Original filename")
    data: str = Field(..., min_length=1, description="Data URL or base64 string")


class UploadImageResponse(BaseModel):
    """Uploaded image response."""

    url: str = Field(..., description="Public URL path to the uploaded image")
