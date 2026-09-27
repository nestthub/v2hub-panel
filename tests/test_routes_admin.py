"""Tests for admin routes and endpoints."""

from __future__ import annotations

import base64
import io
from unittest.mock import patch

from PIL import Image

ADMIN_SECRET = "super-secret-admin-key"


def make_test_png_base64() -> str:
    """Generate a tiny valid PNG image base64 data URL."""
    img = Image.new("RGB", (10, 10), color="blue")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    raw = base64.b64encode(buf.getvalue()).decode("ascii")
    return f"data:image/png;base64,{raw}"


def test_admin_page(client):
    res = client.get("/admin")
    assert res.status_code == 200
    assert "v2hub Admin" in res.text


def test_admin_status_unconfigured(client):
    with patch("v2hub_panel.routes.admin.settings.admin_secret_key", None):
        res = client.get("/api/admin/status")
        assert res.status_code == 200
        assert res.json() == {"authenticated": False, "admin_configured": False}


def test_admin_status_unauthenticated(client):
    with patch("v2hub_panel.routes.admin.settings.admin_secret_key", ADMIN_SECRET):
        res = client.get("/api/admin/status")
        assert res.status_code == 200
        assert res.json() == {"authenticated": False, "admin_configured": True}


def test_admin_login_unconfigured(client):
    with patch("v2hub_panel.routes.admin.settings.admin_secret_key", None):
        res = client.post("/api/admin/login", json={"secret": "any"})
        assert res.status_code == 503


def test_admin_login_invalid_credentials(client):
    with patch("v2hub_panel.routes.admin.settings.admin_secret_key", ADMIN_SECRET):
        res = client.post("/api/admin/login", json={"secret": "wrong"})
        assert res.status_code == 401


def test_admin_login_success(client):
    with patch("v2hub_panel.routes.admin.settings.admin_secret_key", ADMIN_SECRET):
        res = client.post("/api/admin/login", json={"secret": ADMIN_SECRET})
        assert res.status_code == 200
        data = res.json()
        assert data["ok"] is True
        assert "token" in data
        assert "v2hub_admin_token" in res.cookies


def test_admin_settings_protected_requires_auth(client):
    with patch("v2hub_panel.utils.admin_auth.settings.admin_secret_key", ADMIN_SECRET):
        res = client.get("/api/admin/settings")
        assert res.status_code == 401


def test_admin_settings_list_with_auth(client):
    with patch("v2hub_panel.utils.admin_auth.settings.admin_secret_key", ADMIN_SECRET):
        headers = {"Authorization": f"Bearer {ADMIN_SECRET}"}
        res = client.get("/api/admin/settings", headers=headers)
        assert res.status_code == 200
        items = res.json()
        assert any(i["key"] == "default_background" for i in items)


def test_admin_update_setting(client, tmp_path):
    with (
        patch("v2hub_panel.utils.admin_auth.settings.admin_secret_key", ADMIN_SECRET),
        patch("v2hub_panel.routes.admin.settings.admin_secret_key", ADMIN_SECRET),
    ):
        headers = {"Authorization": f"Bearer {ADMIN_SECRET}"}

        # Valid update
        res = client.put(
            "/api/admin/settings/default_background",
            headers=headers,
            json={"value": "midnight"},
        )
        assert res.status_code == 200
        assert res.json()["value"] == "midnight"

        # Check public settings reflect update
        public_res = client.get("/api/settings/public")
        assert public_res.status_code == 200
        assert public_res.json()["default_background"] == "midnight"

        # Check /api/config includes updated setting
        cfg_res = client.get("/api/config")
        assert cfg_res.status_code == 200
        assert cfg_res.json()["settings"]["default_background"] == "midnight"

        # Invalid setting value
        bad_val_res = client.put(
            "/api/admin/settings/default_background",
            headers=headers,
            json={"value": "unsupported_bg_code"},
        )
        assert bad_val_res.status_code == 400

        # Non-existent setting
        not_found_res = client.put(
            "/api/admin/settings/non_existent",
            headers=headers,
            json={"value": "val"},
        )
        assert not_found_res.status_code == 404


def test_admin_upload_image(client, tmp_path):
    with (
        patch("v2hub_panel.utils.admin_auth.settings.admin_secret_key", ADMIN_SECRET),
        patch("v2hub_panel.routes.admin.settings.uploads_dir", tmp_path / "uploads"),
    ):
        headers = {"Authorization": f"Bearer {ADMIN_SECRET}"}
        payload = {
            "filename": "my-bg.png",
            "data": make_test_png_base64(),
        }
        res = client.post("/api/admin/upload", headers=headers, json=payload)
        assert res.status_code == 200
        data = res.json()
        assert "url" in data
        assert data["url"].startswith("/uploads/bg_")


def test_admin_upload_invalid_data(client):
    with patch("v2hub_panel.utils.admin_auth.settings.admin_secret_key", ADMIN_SECRET):
        headers = {"Authorization": f"Bearer {ADMIN_SECRET}"}
        payload = {
            "filename": "my-bg.png",
            "data": "not-valid-base64@@",
        }
        res = client.post("/api/admin/upload", headers=headers, json=payload)
        assert res.status_code == 400
