"""Tests for routes/connection.py's GET /api/config endpoint."""

from __future__ import annotations

from unittest.mock import patch


def test_config_includes_app_version(client):
    """
    /api/config must expose app_version so the frontend can render the
    actual running version instead of a hardcoded string in index.html.
    """
    with patch("v2hub_panel.routes.connection.settings.app_version", "9.9.9"):
        res = client.get("/api/config")

    assert res.status_code == 200
    body = res.json()
    assert body["app_version"] == "9.9.9"


def test_config_shape(client):
    """/api/config always returns these top-level keys."""
    res = client.get("/api/config")

    assert res.status_code == 200
    body = res.json()
    assert "fixed_api_url" in body
    assert "telegram_autofill_enabled" in body
    assert "app_version" in body
    assert "settings" in body
    assert isinstance(body["settings"], dict)
