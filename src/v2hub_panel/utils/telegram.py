"""Telegram Mini App initData validation.

Implements Telegram's official algorithm for verifying that a WebApp
launch's initData genuinely came from Telegram (i.e. wasn't forged by
someone who simply crafted a `?token=...`-style query string by hand):

    https://docs.telegram-mini-apps.com/platform/init-data
    https://core.telegram.org/bots/webapps#validating-data-received-via-the-web-app

Only ever used server-side. initData must never be trusted based on its
mere presence or shape alone -- it carries a `hash` field that is an
HMAC-SHA256 signature over the rest of the data, keyed by a value derived
from the bot token, and that signature is what actually proves
authenticity.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import time
from dataclasses import dataclass
from urllib.parse import parse_qsl

# initData is considered stale (and rejected) once it's older than this,
# to bound how long a captured/replayed initData string could be reused --
# Telegram itself recommends a similar short window since a Mini App is
# expected to send its initData once, right at launch.
MAX_INIT_DATA_AGE_SECONDS = 300


@dataclass(frozen=True)
class TelegramUser:
    id: int
    first_name: str | None = None
    username: str | None = None


class InvalidInitData(Exception):
    """initData failed signature, freshness, or shape validation."""


def validate_init_data(init_data: str, bot_token: str, *, now: float | None = None) -> TelegramUser:
    """
    Validate a Telegram WebApp initData string and return its user.

    Raises InvalidInitData if the signature doesn't match, the data is
    stale (older than MAX_INIT_DATA_AGE_SECONDS), or the `user` field is
    missing/malformed. Never raises anything else -- any parsing problem
    is folded into InvalidInitData so callers have exactly one exception
    to handle.
    """
    if not init_data:
        raise InvalidInitData("empty initData")

    try:
        pairs = parse_qsl(init_data, strict_parsing=True, keep_blank_values=True)
    except ValueError as exc:
        raise InvalidInitData("malformed initData query string") from exc

    data: dict[str, str] = dict(pairs)

    received_hash = data.pop("hash", None)
    if not received_hash:
        raise InvalidInitData("missing hash field")

    # Step 1: build the check string -- every remaining key=value pair,
    # sorted alphabetically by key, joined with "\n". The hash field
    # itself is excluded (already popped above).
    check_string = "\n".join(f"{key}={value}" for key, value in sorted(data.items()))

    # Step 2: derive the signing secret from the bot token. The literal
    # string "WebAppData" here is not a placeholder -- it's a fixed,
    # Telegram-specified constant, the same for every bot.
    secret_key = hmac.new(b"WebAppData", bot_token.encode(), hashlib.sha256).digest()

    # Step 3: the actual signature to compare against `hash`.
    computed_hash = hmac.new(secret_key, check_string.encode(), hashlib.sha256).hexdigest()

    if not hmac.compare_digest(computed_hash, received_hash):
        raise InvalidInitData("signature mismatch")

    auth_date_raw = data.get("auth_date")
    if not auth_date_raw or not auth_date_raw.isdigit():
        raise InvalidInitData("missing or malformed auth_date")

    current_time = time.time() if now is None else now
    age = current_time - int(auth_date_raw)
    if age > MAX_INIT_DATA_AGE_SECONDS:
        raise InvalidInitData("initData is too old")
    if age < -30:
        # A small amount of negative slack accounts for clock skew between
        # this server and Telegram's, without accepting data claiming to
        # be from meaningfully far in the future.
        raise InvalidInitData("auth_date is in the future")

    user_raw = data.get("user")
    if not user_raw:
        raise InvalidInitData("missing user field")

    try:
        user_obj = json.loads(user_raw)
    except (json.JSONDecodeError, TypeError) as exc:
        raise InvalidInitData("malformed user field") from exc

    user_id = user_obj.get("id")
    if not isinstance(user_id, int):
        raise InvalidInitData("user.id missing or not an integer")

    return TelegramUser(
        id=user_id,
        first_name=user_obj.get("first_name"),
        username=user_obj.get("username"),
    )
