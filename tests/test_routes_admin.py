"""Tests for admin routes and endpoints."""

from __future__ import annotations

from unittest.mock import patch

ADMIN_SECRET = "super-secret-admin-key"


def test_admin_page(client):
    res = client.get("/admin")
    assert res.status_code == 200
    assert "v2hub Admin" in res.text


def test_admin_status_unconfigured(client):
    with (
        patch("v2hub_panel.utils.admin_auth.settings.admin_panel_password", None),
    ):
        res = client.get("/api/admin/status")
        assert res.status_code == 200
        assert res.json() == {"authenticated": False, "admin_configured": False}


def test_admin_status_unauthenticated(client):
    with patch("v2hub_panel.utils.admin_auth.settings.admin_panel_password", ADMIN_SECRET):
        res = client.get("/api/admin/status")
        assert res.status_code == 200
        assert res.json() == {"authenticated": False, "admin_configured": True}


def test_admin_login_unconfigured(client):
    with (
        patch("v2hub_panel.utils.admin_auth.settings.admin_panel_password", None),
    ):
        res = client.post("/api/admin/login", json={"secret": "any"})
        assert res.status_code == 503


def test_admin_login_invalid_credentials(client):
    with patch("v2hub_panel.utils.admin_auth.settings.admin_panel_password", ADMIN_SECRET):
        res = client.post("/api/admin/login", json={"secret": "wrong"})
        assert res.status_code == 401


def test_admin_login_success(client):
    with patch("v2hub_panel.utils.admin_auth.settings.admin_panel_password", ADMIN_SECRET):
        res = client.post("/api/admin/login", json={"secret": ADMIN_SECRET})
        assert res.status_code == 200
        data = res.json()
        assert data == {"ok": True}
        assert "token" not in data  # Token must not be in JSON response body
        assert "v2hub_admin_token" in res.cookies

        # Verify HttpOnly, Secure, and 3-day max-age attributes
        set_cookie_header = res.headers.get("set-cookie", "")
        assert "httponly" in set_cookie_header.lower()
        assert "secure" in set_cookie_header.lower()
        assert "max-age=259200" in set_cookie_header.lower()  # 3 days = 3 * 86400


def test_admin_cookie_auth_flow():
    from fastapi.testclient import TestClient

    from v2hub_panel.main import app

    with (
        patch("v2hub_panel.utils.admin_auth.settings.admin_panel_password", ADMIN_SECRET),
        TestClient(app, base_url="https://testserver") as https_client,
    ):
        # 1. Login and obtain HttpOnly Secure cookie
        login_res = https_client.post("/api/admin/login", json={"secret": ADMIN_SECRET})
        assert login_res.status_code == 200
        cookie_val = login_res.cookies.get("v2hub_admin_token")
        assert cookie_val is not None

        # 2. Access protected endpoint using cookie without Authorization header
        status_res = https_client.get("/api/admin/settings")
        assert status_res.status_code == 200
        items = status_res.json()
        assert any(i["key"] == "default_theme" for i in items)

        # 3. Logout clears cookie
        logout_res = https_client.post("/api/admin/logout")
        assert logout_res.status_code == 200


def test_admin_settings_protected_requires_auth(client):
    with patch("v2hub_panel.utils.admin_auth.settings.admin_panel_password", ADMIN_SECRET):
        res = client.get("/api/admin/settings")
        assert res.status_code == 401


def test_admin_settings_list_with_auth(client):
    from v2hub_panel.utils.admin_auth import generate_admin_token

    with patch("v2hub_panel.utils.admin_auth.settings.admin_panel_password", ADMIN_SECRET):
        headers = {"Authorization": f"Bearer {generate_admin_token(ADMIN_SECRET)}"}
        res = client.get("/api/admin/settings", headers=headers)
        assert res.status_code == 200
        items = res.json()
        assert any(i["key"] == "default_theme" for i in items)


def test_admin_settings_rejects_raw_password_headers(client):
    with patch("v2hub_panel.utils.admin_auth.settings.admin_panel_password", ADMIN_SECRET):
        bearer_res = client.get(
            "/api/admin/settings",
            headers={"Authorization": f"Bearer {ADMIN_SECRET}"},
        )
        secret_res = client.get(
            "/api/admin/settings",
            headers={"X-Admin-Secret": ADMIN_SECRET},
        )

        assert bearer_res.status_code == 401
        assert secret_res.status_code == 401


def test_admin_update_setting(client, tmp_path):
    from v2hub_panel.utils.admin_auth import generate_admin_token

    with (
        patch("v2hub_panel.utils.admin_auth.settings.admin_panel_password", ADMIN_SECRET),
    ):
        headers = {"Authorization": f"Bearer {generate_admin_token(ADMIN_SECRET)}"}

        # Valid update: "light"
        res = client.put(
            "/api/admin/settings/default_theme",
            headers=headers,
            json={"value": "light"},
        )
        assert res.status_code == 200
        assert res.json()["value"] == "light"

        # Check public settings reflect update
        public_res = client.get("/api/settings/public")
        assert public_res.status_code == 200
        assert public_res.json()["default_theme"] == "light"
        assert public_res.json()["default_background"] == "light"

        # Check /api/config includes updated setting
        cfg_res = client.get("/api/config")
        assert cfg_res.status_code == 200
        assert cfg_res.json()["settings"]["default_theme"] == "light"
        assert cfg_res.json()["settings"]["default_background"] == "light"

        # Update via backwards-compatible alias default_background
        alias_res = client.put(
            "/api/admin/settings/default_background",
            headers=headers,
            json={"value": "dark"},
        )
        assert alias_res.status_code == 200
        assert alias_res.json()["value"] == "dark"

        # Invalid setting value (e.g. arbitrary background image or preset)
        bad_val_res = client.put(
            "/api/admin/settings/default_theme",
            headers=headers,
            json={"value": "midnight"},
        )
        assert bad_val_res.status_code == 400

        # Non-existent setting
        not_found_res = client.put(
            "/api/admin/settings/non_existent",
            headers=headers,
            json={"value": "val"},
        )
        assert not_found_res.status_code == 404


def test_admin_image_upload_is_not_available(client):
    res = client.post(
        "/api/admin/upload",
        json={"filename": "background.png", "data": "data:image/png;base64,AAAA"},
    )
    assert res.status_code == 404
