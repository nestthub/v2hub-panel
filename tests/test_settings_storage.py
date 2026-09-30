"""Tests for SettingsStorage SQLite persistence."""

from __future__ import annotations

from v2hub_panel.services.settings_storage import SettingsStorage


def test_settings_storage_crud(tmp_path):
    db_file = tmp_path / "test_settings.db"
    storage = SettingsStorage(db_file)

    # Initial state: empty
    assert storage.get_setting("default_background") is None
    assert storage.get_all_settings() == {}

    # Set setting
    storage.set_setting("default_background", "midnight", "select")
    res = storage.get_setting("default_background")
    assert res is not None
    assert res["key"] == "default_background"
    assert res["value"] == "midnight"
    assert res["type"] == "select"
    assert "updated_at" in res

    # Update setting
    storage.set_setting("default_background", "aurora", "select")
    res2 = storage.get_setting("default_background")
    assert res2 is not None
    assert res2["value"] == "aurora"

    # All settings
    all_s = storage.get_all_settings()
    assert "default_background" in all_s
    assert all_s["default_background"]["value"] == "aurora"

    # Delete setting
    deleted = storage.delete_setting("default_background")
    assert deleted is True
    assert storage.get_setting("default_background") is None

    # Delete non-existent
    deleted_again = storage.delete_setting("default_background")
    assert deleted_again is False
