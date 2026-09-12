"""Telegram Mini App auto-fill endpoint.

Lets the panel auto-fill a user's v2hub API token on first load inside a
Telegram Mini App, instead of making them paste it in by hand. Fully
optional: if telegram_bot_token / admin_secret_key / fixed_api_url aren't
all configured, or the optional v2hub-admin package isn't installed (see
Settings.telegram_autofill_enabled), this endpoint does nothing but
report itself as unavailable -- no initData is ever looked at, no admin
access is used, and every other panel feature is completely unaffected.
This is what keeps the feature backward compatible: an existing
deployment that doesn't set the new env vars (or doesn't install the new
optional dependency) behaves exactly as it did before this endpoint
existed, and never throws for that reason.
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException

from ..config import settings
from ..models import TelegramAuthRequest, TelegramAuthResponse
from ..models.responses import ErrorDetail
from ..services.telegram_auth import TelegramAutofillUnavailable, get_or_create_api_token
from ..utils import with_error_mapping
from ..utils.telegram import InvalidInitData, validate_init_data

log = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["auth"])

_UNAVAILABLE_DETAIL = ErrorDetail(
    error="telegram_autofill_disabled",
    message="Telegram auto-fill is not configured on this deployment",
).model_dump()


@router.post("/telegram", response_model=TelegramAuthResponse)
async def telegram_auto_fill(payload: TelegramAuthRequest) -> TelegramAuthResponse:
    """
    Resolve a Telegram Mini App launch's initData to a v2hub API token.

    503 if the feature isn't configured on this deployment at all, or the
    optional v2hub-admin package isn't installed (the frontend is
    expected to check GET /api/config first and skip calling this
    endpoint entirely in that case — this response only exists as a
    safety net for callers that call it anyway).

    401 if initData fails signature/freshness validation — i.e. it either
    wasn't really issued by Telegram for this bot, or it's stale enough
    that we no longer trust it as representing "the user opened the mini
    app just now".
    """
    if not settings.telegram_autofill_enabled or not settings.telegram_bot_token:
        raise HTTPException(status_code=503, detail=_UNAVAILABLE_DETAIL)

    try:
        user = validate_init_data(payload.init_data, settings.telegram_bot_token)
    except InvalidInitData as exc:
        log.warning("Rejected Telegram initData: %s", exc)
        raise HTTPException(
            status_code=401,
            detail=ErrorDetail(
                error="invalid_init_data",
                message="Telegram initData failed validation",
            ).model_dump(),
        ) from exc

    try:
        api_token = await with_error_mapping(get_or_create_api_token, user.id)
    except TelegramAutofillUnavailable as exc:
        # Defense in depth: telegram_autofill_enabled already checks that
        # v2hub-admin is installed, so this shouldn't normally trigger,
        # but if it somehow does, fail the same way as "not configured"
        # rather than letting anything unexpected escape as a 500.
        log.warning("Telegram auto-fill unavailable: %s", exc)
        raise HTTPException(status_code=503, detail=_UNAVAILABLE_DETAIL) from exc

    return TelegramAuthResponse(api_token=api_token, base_url=settings.fixed_api_url)
