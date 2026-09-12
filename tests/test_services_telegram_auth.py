"""Tests for services/telegram_auth.py."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from v2hub import NotFoundError
from v2hub_panel.services.telegram_auth import (
    TelegramAutofillUnavailable,
    get_or_create_api_token,
)

pytestmark = pytest.mark.asyncio


@pytest.fixture
def valid_telegram_autofill_settings(monkeypatch) -> None:
    from v2hub_panel.config import settings

    monkeypatch.setattr(settings, "telegram_bot_token", "bot-token")
    monkeypatch.setattr(settings, "admin_secret_key", "admin-secret")
    monkeypatch.setattr(settings, "fixed_api_url", "https://v2hub.test")


@pytest.fixture
def mock_admin_client():
    with patch("v2hub_admin.AsyncAdminClient") as MockClient:
        instance = AsyncMock()
        MockClient.return_value.__aenter__.return_value = instance
        MockClient.return_value.__aexit__.return_value = False
        yield instance


async def test_returns_existing_user_token_without_creating(
    valid_telegram_autofill_settings,
    mock_admin_client,
) -> None:
    mock_admin_client.get_user.return_value = MagicMock(api_token="existing-token")

    token = await get_or_create_api_token(12345)

    assert token == "existing-token"
    mock_admin_client.get_user.assert_awaited_once_with(12345)
    mock_admin_client.create_user.assert_not_awaited()


async def test_creates_user_when_not_found(
    valid_telegram_autofill_settings,
    mock_admin_client,
) -> None:
    mock_admin_client.get_user.side_effect = NotFoundError("not found")
    mock_admin_client.create_user.return_value = MagicMock(api_token="brand-new-token")

    token = await get_or_create_api_token(98765)

    assert token == "brand-new-token"
    mock_admin_client.get_user.assert_awaited_once_with(98765)
    mock_admin_client.create_user.assert_awaited_once_with(98765)


async def test_propagates_non_not_found_errors(
    valid_telegram_autofill_settings,
    mock_admin_client,
) -> None:
    from v2hub import AuthenticationError

    mock_admin_client.get_user.side_effect = AuthenticationError("bad secret")

    with pytest.raises(AuthenticationError):
        await get_or_create_api_token(1)

    mock_admin_client.create_user.assert_not_awaited()


@pytest.mark.parametrize(
    "missing_field",
    ["telegram_bot_token", "admin_secret_key", "fixed_api_url"],
)
async def test_raises_without_request_when_a_required_setting_is_missing(
    monkeypatch,
    missing_field,
) -> None:
    from v2hub_panel.config import settings as real_settings

    monkeypatch.setattr(real_settings, "telegram_bot_token", "bot-token")
    monkeypatch.setattr(real_settings, "admin_secret_key", "admin-secret")
    monkeypatch.setattr(real_settings, "fixed_api_url", "https://v2hub.test")
    monkeypatch.setattr(real_settings, missing_field, None)

    with patch("v2hub_admin.AsyncAdminClient") as MockClient:
        with pytest.raises(TelegramAutofillUnavailable):
            await get_or_create_api_token(1)

        MockClient.assert_not_called()


async def test_raises_clean_error_when_v2hub_admin_not_installed(
    valid_telegram_autofill_settings,
    monkeypatch,
) -> None:
    import builtins

    real_import = builtins.__import__

    def fake_import(name, *args, **kwargs):
        if name == "v2hub_admin":
            raise ImportError("No module named 'v2hub_admin'")
        return real_import(name, *args, **kwargs)

    monkeypatch.setattr(builtins, "__import__", fake_import)

    with pytest.raises(TelegramAutofillUnavailable):
        await get_or_create_api_token(1)
