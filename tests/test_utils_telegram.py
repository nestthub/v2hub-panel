"""Tests for utils/telegram.py's initData validation.

sign_init_data() below re-implements Telegram's signing algorithm
independently of validate_init_data() (rather than calling it or sharing
code with it) so these tests actually catch a broken validator instead of
just confirming sign/verify agree with each other by construction.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import time
from urllib.parse import urlencode

import pytest

from v2hub_panel.utils.telegram import (
    MAX_INIT_DATA_AGE_SECONDS,
    InvalidInitData,
    validate_init_data,
)

BOT_TOKEN = "123456:test-bot-token-abcdef"


def sign_init_data(
    *,
    bot_token: str = BOT_TOKEN,
    user: dict | None = None,
    auth_date: int | None = None,
    extra_fields: dict | None = None,
    omit_user: bool = False,
    tamper_hash: bool = False,
) -> str:
    """Build a real, correctly-signed initData query string for testing."""
    if auth_date is None:
        auth_date = int(time.time())
    if user is None:
        user = {"id": 12345, "first_name": "Alice", "username": "alice"}

    data: dict[str, str] = {"auth_date": str(auth_date)}
    if not omit_user:
        data["user"] = json.dumps(user, separators=(",", ":"))
    if extra_fields:
        data.update(extra_fields)

    check_string = "\n".join(f"{k}={v}" for k, v in sorted(data.items()))
    secret_key = hmac.new(b"WebAppData", bot_token.encode(), hashlib.sha256).digest()
    computed_hash = hmac.new(secret_key, check_string.encode(), hashlib.sha256).hexdigest()

    if tamper_hash:
        computed_hash = "0" * len(computed_hash)

    data["hash"] = computed_hash
    return urlencode(data)


class TestValidInitData:
    def test_returns_user_from_valid_init_data(self) -> None:
        init_data = sign_init_data(user={"id": 999, "first_name": "Bob", "username": "bobby"})

        user = validate_init_data(init_data, BOT_TOKEN)

        assert user.id == 999
        assert user.first_name == "Bob"
        assert user.username == "bobby"

    def test_user_without_username_is_fine(self) -> None:
        init_data = sign_init_data(user={"id": 1, "first_name": "NoHandle"})

        user = validate_init_data(init_data, BOT_TOKEN)

        assert user.id == 1
        assert user.username is None

    def test_extra_unrelated_fields_do_not_break_validation(self) -> None:
        # query_id, chat_instance, start_param, etc. are all real fields
        # Telegram may include -- the check string must still be built
        # correctly (alphabetically sorted) regardless of which subset of
        # fields is present.
        init_data = sign_init_data(
            extra_fields={"query_id": "AAF1", "chat_instance": "-42", "start_param": "ref_x"}
        )

        user = validate_init_data(init_data, BOT_TOKEN)

        assert user.id == 12345

    def test_auth_date_just_under_the_age_limit_is_accepted(self) -> None:
        stale_but_ok = int(time.time()) - (MAX_INIT_DATA_AGE_SECONDS - 5)
        init_data = sign_init_data(auth_date=stale_but_ok)

        user = validate_init_data(init_data, BOT_TOKEN)

        assert user.id == 12345

    def test_small_negative_clock_skew_is_tolerated(self) -> None:
        slightly_future = int(time.time()) + 10
        init_data = sign_init_data(auth_date=slightly_future)

        user = validate_init_data(init_data, BOT_TOKEN)

        assert user.id == 12345


class TestSignatureRejection:
    def test_rejects_tampered_hash(self) -> None:
        init_data = sign_init_data(tamper_hash=True)

        with pytest.raises(InvalidInitData, match="signature mismatch"):
            validate_init_data(init_data, BOT_TOKEN)

    def test_rejects_wrong_bot_token(self) -> None:
        init_data = sign_init_data(bot_token=BOT_TOKEN)

        with pytest.raises(InvalidInitData, match="signature mismatch"):
            validate_init_data(init_data, "a-different-bot-token")

    def test_rejects_tampered_user_field(self) -> None:
        # Sign as user 1, then splice in a different user id after the
        # fact -- simulates someone trying to escalate to a different
        # account by editing the query string post-signing.
        init_data = sign_init_data(user={"id": 1, "first_name": "Real"})
        forged = init_data.replace("%22id%22%3A1", "%22id%22%3A99999")

        with pytest.raises(InvalidInitData, match="signature mismatch"):
            validate_init_data(forged, BOT_TOKEN)

    def test_rejects_missing_hash_field(self) -> None:
        init_data = sign_init_data()
        without_hash = "&".join(
            pair for pair in init_data.split("&") if not pair.startswith("hash=")
        )

        with pytest.raises(InvalidInitData, match="missing hash"):
            validate_init_data(without_hash, BOT_TOKEN)


class TestFreshnessRejection:
    def test_rejects_expired_init_data(self) -> None:
        too_old = int(time.time()) - (MAX_INIT_DATA_AGE_SECONDS + 60)
        init_data = sign_init_data(auth_date=too_old)

        with pytest.raises(InvalidInitData, match="too old"):
            validate_init_data(init_data, BOT_TOKEN)

    def test_rejects_auth_date_far_in_the_future(self) -> None:
        far_future = int(time.time()) + 3600
        init_data = sign_init_data(auth_date=far_future)

        with pytest.raises(InvalidInitData, match="future"):
            validate_init_data(init_data, BOT_TOKEN)


class TestShapeRejection:
    def test_rejects_empty_string(self) -> None:
        with pytest.raises(InvalidInitData, match="empty"):
            validate_init_data("", BOT_TOKEN)

    def test_rejects_missing_user_field(self) -> None:
        init_data = sign_init_data(omit_user=True)

        with pytest.raises(InvalidInitData, match="missing user"):
            validate_init_data(init_data, BOT_TOKEN)

    def test_rejects_malformed_user_json(self) -> None:
        # Can't use sign_init_data for this -- it JSON-encodes user
        # itself -- so build + sign the check string by hand instead.
        auth_date = str(int(time.time()))
        data = {"auth_date": auth_date, "user": "{not-json"}
        check_string = "\n".join(f"{k}={v}" for k, v in sorted(data.items()))
        secret_key = hmac.new(b"WebAppData", BOT_TOKEN.encode(), hashlib.sha256).digest()
        data["hash"] = hmac.new(secret_key, check_string.encode(), hashlib.sha256).hexdigest()
        init_data = urlencode(data)

        with pytest.raises(InvalidInitData, match="malformed user"):
            validate_init_data(init_data, BOT_TOKEN)

    def test_rejects_user_without_integer_id(self) -> None:
        auth_date = str(int(time.time()))
        user_json = json.dumps({"id": "not-an-int", "first_name": "X"}, separators=(",", ":"))
        data = {"auth_date": auth_date, "user": user_json}
        check_string = "\n".join(f"{k}={v}" for k, v in sorted(data.items()))
        secret_key = hmac.new(b"WebAppData", BOT_TOKEN.encode(), hashlib.sha256).digest()
        data["hash"] = hmac.new(secret_key, check_string.encode(), hashlib.sha256).hexdigest()
        init_data = urlencode(data)

        with pytest.raises(InvalidInitData, match="not an integer"):
            validate_init_data(init_data, BOT_TOKEN)

    def test_rejects_missing_auth_date(self) -> None:
        # Sign a check string that never included auth_date at all, rather
        # than stripping it post-signing — stripping it after signing
        # would (correctly) fail signature verification first, since
        # auth_date is itself part of what's signed, and that's not the
        # code path this test is trying to isolate.
        user_json = json.dumps({"id": 1, "first_name": "X"}, separators=(",", ":"))
        data = {"user": user_json}
        check_string = "\n".join(f"{k}={v}" for k, v in sorted(data.items()))
        secret_key = hmac.new(b"WebAppData", BOT_TOKEN.encode(), hashlib.sha256).digest()
        data["hash"] = hmac.new(secret_key, check_string.encode(), hashlib.sha256).hexdigest()
        init_data = urlencode(data)

        with pytest.raises(InvalidInitData, match="auth_date"):
            validate_init_data(init_data, BOT_TOKEN)
