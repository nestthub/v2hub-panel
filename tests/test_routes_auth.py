"""Tests for routes/auth.py's /api/auth/telegram endpoint.

Uses the real FastAPI app (via the `client` fixture from conftest.py) so
these exercise the actual routing/dependency wiring, not just the
handler function in isolation. v2hub_panel.config.settings is patched
directly (rather than via env vars) since it's already constructed by
the time these tests run.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import time
from unittest.mock import AsyncMock, MagicMock, patch
from urllib.parse import urlencode

import pytest

BOT_TOKEN = "123456:test-bot-token-abcdef"
ADMIN_SECRET = "test-admin-secret"
FIXED_URL = "https://v2hub.test"


def sign_init_data(bot_token: str = BOT_TOKEN, user_id: int = 12345) -> str:
    auth_date = int(time.time())
    user_json = json.dumps({"id": user_id, "first_name": "Alice"}, separators=(",", ":"))
    data = {"auth_date": str(auth_date), "user": user_json}
    check_string = "\n".join(f"{k}={v}" for k, v in sorted(data.items()))
    secret_key = hmac.new(b"WebAppData", bot_token.encode(), hashlib.sha256).digest()
    data["hash"] = hmac.new(secret_key, check_string.encode(), hashlib.sha256).hexdigest()
    return urlencode(data)


@pytest.fixture
def autofill_enabled():
    """Patch settings so telegram_autofill_enabled is True for the test."""
    with (
        patch("v2hub_panel.routes.auth.settings.telegram_bot_token", BOT_TOKEN),
        patch("v2hub_panel.routes.auth.settings.admin_secret_key", ADMIN_SECRET),
        patch("v2hub_panel.routes.auth.settings.fixed_api_url", FIXED_URL),
    ):
        yield


@pytest.fixture
def mock_admin_client():
    with patch("v2hub_admin.AsyncAdminClient") as MockClient:
        instance = AsyncMock()
        MockClient.return_value.__aenter__.return_value = instance
        MockClient.return_value.__aexit__.return_value = False
        yield instance


class TestFeatureDisabled:
    def test_returns_503_when_not_configured_at_all(self, client) -> None:
        # conftest.py already forces fixed_api_url empty and the other two
        # settings default to None, so autofill is off by default here.
        resp = client.post("/api/auth/telegram", json={"init_data": "whatever"})

        assert resp.status_code == 503
        assert resp.json()["detail"]["error"] == "telegram_autofill_disabled"

    def test_returns_503_when_only_bot_token_is_set(self, client) -> None:
        with patch("v2hub_panel.routes.auth.settings.telegram_bot_token", BOT_TOKEN):
            resp = client.post("/api/auth/telegram", json={"init_data": "whatever"})

        assert resp.status_code == 503

    def test_returns_503_when_bot_token_and_secret_set_but_no_fixed_url(self, client) -> None:
        # Deliberately mirrors telegram_autofill_enabled's requirement
        # that fixed_api_url be set too -- see config.py's docstring for
        # why "bring your own server" mode can't support this feature.
        with (
            patch("v2hub_panel.routes.auth.settings.telegram_bot_token", BOT_TOKEN),
            patch("v2hub_panel.routes.auth.settings.admin_secret_key", ADMIN_SECRET),
        ):
            resp = client.post("/api/auth/telegram", json={"init_data": "whatever"})

        assert resp.status_code == 503


class TestInvalidInitData:
    def test_rejects_garbage_init_data(self, client, autofill_enabled) -> None:
        resp = client.post("/api/auth/telegram", json={"init_data": "not-real-init-data"})

        assert resp.status_code == 401
        assert resp.json()["detail"]["error"] == "invalid_init_data"

    def test_rejects_init_data_signed_with_wrong_bot_token(self, client, autofill_enabled) -> None:
        init_data = sign_init_data(bot_token="a-different-token")

        resp = client.post("/api/auth/telegram", json={"init_data": init_data})

        assert resp.status_code == 401

    def test_rejects_empty_init_data_body(self, client, autofill_enabled) -> None:
        resp = client.post("/api/auth/telegram", json={"init_data": ""})

        # Empty string fails Pydantic's min_length=1 before it even
        # reaches validate_init_data.
        assert resp.status_code == 422


class TestSuccess:
    def test_returns_existing_users_token(
        self, client, autofill_enabled, mock_admin_client
    ) -> None:
        mock_admin_client.get_user.return_value = MagicMock(api_token="existing-token")
        init_data = sign_init_data(user_id=555)

        resp = client.post("/api/auth/telegram", json={"init_data": init_data})

        assert resp.status_code == 200
        body = resp.json()
        assert body["api_token"] == "existing-token"
        assert body["base_url"] == FIXED_URL
        mock_admin_client.get_user.assert_awaited_once_with(555)
        mock_admin_client.create_user.assert_not_awaited()

    def test_creates_account_for_first_time_user(
        self, client, autofill_enabled, mock_admin_client
    ) -> None:
        from v2hub import NotFoundError

        mock_admin_client.get_user.side_effect = NotFoundError("not found")
        mock_admin_client.create_user.return_value = MagicMock(api_token="fresh-token")
        init_data = sign_init_data(user_id=777)

        resp = client.post("/api/auth/telegram", json={"init_data": init_data})

        assert resp.status_code == 200
        assert resp.json()["api_token"] == "fresh-token"
        mock_admin_client.create_user.assert_awaited_once_with(777)
