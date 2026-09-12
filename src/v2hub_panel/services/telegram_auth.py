"""Telegram Mini App auto-fill — resolves a validated Telegram user_id to
a v2hub API token via v2hub-admin, creating the v2hub account on the fly
if this is the user's first time (mirrors what v2hub-bot's /start does).

Only ever called after utils.telegram.validate_init_data has confirmed
the request genuinely came from that Telegram user -- this module itself
does no authenticity checking, it only turns an already-trusted user_id
into a token.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, cast

from v2hub import NotFoundError

from ..config import settings

if TYPE_CHECKING:
    from v2hub_admin.models import UserResponse


class TelegramAutofillUnavailable(Exception):
    """Raised when Telegram auto-fill can't actually run right now --
    either because one of the required settings (telegram_bot_token,
    admin_secret_key, fixed_api_url) isn't set, or because the optional
    ``v2hub-admin`` package isn't installed.

    In normal operation, ``routes.auth.telegram_auto_fill`` never even
    reaches this module unless ``settings.telegram_autofill_enabled`` is
    already True, and that property itself checks all of the above --
    so the checks in this module are a defensive second layer, not the
    primary guard. They exist so that even if this function is ever
    called directly (bypassing that property, or after settings changed
    out from under it), the caller still gets one clean, expected
    exception to catch and map to "feature unavailable", never a raw
    ``AttributeError``/``TypeError``/``ImportError`` bubbling up as an
    unhandled 500.
    """


async def get_or_create_api_token(user_id: int) -> str:
    """
    Return this user's v2hub API token, creating the account if needed.

    Before making any request to the v2hub server, this checks -- again
    -- that every one of telegram_bot_token, admin_secret_key, and
    fixed_api_url is actually set, and that v2hub-admin is installed. If
    any of that isn't true, it raises TelegramAutofillUnavailable and
    makes no request at all; it never lets a missing setting or missing
    package turn into a confusing error from deep inside AsyncAdminClient.

    Once past those checks, this raises whatever
    v2hub_admin.AsyncAdminClient raises on genuine failures
    (AuthenticationError for a bad admin_secret_key, VPNAPIError
    subclasses for anything else) -- callers should route those through
    the same error mapping used for the regular v2hub client (see
    utils.exceptions.with_error_mapping).
    """
    if not (settings.telegram_bot_token and settings.admin_secret_key and settings.fixed_api_url):
        raise TelegramAutofillUnavailable(
            "Telegram auto-fill is missing required settings "
            "(telegram_bot_token, admin_secret_key, or fixed_api_url); "
            "skipping the request to the v2hub server"
        )

    # Imported lazily so this module — and everything that transitively
    # imports it — doesn't require v2hub-admin to be installed at all on
    # deployments that don't configure Telegram auto-fill. v2hub-admin is
    # an optional dependency of this package for exactly that reason (see
    # pyproject.toml's [project.optional-dependencies]).
    try:
        from v2hub_admin import AsyncAdminClient
    except ImportError as exc:
        raise TelegramAutofillUnavailable(
            "v2hub-admin is not installed; Telegram auto-fill can't run"
        ) from exc

    async with AsyncAdminClient(
        base_url=settings.fixed_api_url,
        secret_key=settings.admin_secret_key,
    ) as admin:
        try:
            user: UserResponse = await admin.get_user(user_id)
        except NotFoundError:
            user = await admin.create_user(user_id)

        return cast("str", user.api_token)
