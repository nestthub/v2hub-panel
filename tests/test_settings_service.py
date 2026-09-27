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
    assert "default_background" in settings
    assert settings["default_background"] == "default"


def test_update_setting_valid_preset(service):
    result = service.update_setting("default_background", "midnight")
    assert result["value"] == "midnight"

    # Check public settings reflect update
    public = service.get_public_settings()
    assert public["default_background"] == "midnight"


def test_update_setting_valid_url(service):
    url = "https://example.com/bg.png"
    result = service.update_setting("default_background", url)
    assert result["value"] == url

    public = service.get_public_settings()
    assert public["default_background"] == url


def test_update_setting_invalid_value(service):
    with pytest.raises(ValueError, match="Background must be a preset"):
        service.update_setting("default_background", "invalid_preset_value")


def test_update_unknown_setting(service):
    with pytest.raises(KeyError, match="Unknown setting"):
        service.update_setting("non_existent_key", "val")


def test_admin_settings_list(service):
    items = service.get_all_settings_admin()
    assert len(items) >= 1
    bg = next(item for item in items if item["key"] == "default_background")
    assert bg["type"] == "select"
    assert bg["value"] == "default"
    assert len(bg["options"]) > 0
