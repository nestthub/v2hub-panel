"""Tests for SettingsService and validation."""

from __future__ import annotations

import pytest

from v2hub_panel.services.settings_service import SettingsService
from v2hub_panel.services.settings_storage import SettingsStorage


@pytest.fixture
def service(tmp_path):
    storage = SettingsStorage(tmp_path / "test.db")
    return SettingsService(storage)


def test_public_settings_default(service):
    settings = service.get_public_settings()
    assert "default_theme" in settings
    assert settings["default_theme"] == "dark"
    assert "default_background" in settings
    assert settings["default_background"] == "dark"


def test_update_setting_valid_theme(service):
    result = service.update_setting("default_theme", "light")
    assert result["value"] == "light"

    # Check public settings reflect update
    public = service.get_public_settings()
    assert public["default_theme"] == "light"
    assert public["default_background"] == "light"


def test_update_setting_via_alias(service):
    result = service.update_setting("default_background", "dark")
    assert result["value"] == "dark"

    public = service.get_public_settings()
    assert public["default_theme"] == "dark"
    assert public["default_background"] == "dark"


def test_update_setting_invalid_value(service):
    with pytest.raises(ValueError, match="Theme must be either 'dark' or 'light'"):
        service.update_setting("default_theme", "midnight")

    with pytest.raises(ValueError, match="Theme must be either 'dark' or 'light'"):
        service.update_setting("default_theme", "https://example.com/bg.png")


def test_update_unknown_setting(service):
    with pytest.raises(KeyError, match="Unknown setting"):
        service.update_setting("non_existent_key", "val")


def test_admin_settings_list(service):
    items = service.get_all_settings_admin()
    assert len(items) >= 1
    theme_setting = next(item for item in items if item["key"] == "default_theme")
    assert theme_setting["type"] == "select"
    assert theme_setting["value"] == "dark"
    assert len(theme_setting["options"]) == 2
    option_values = {opt["value"] for opt in theme_setting["options"]}
    assert option_values == {"dark", "light"}
