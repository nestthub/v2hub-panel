"""
Tests for the provider connection routes (issue #11).

These endpoints are thin proxies over the v2hub SDK's provider-connection
methods (get_connection / approve_connection / reject_connection /
revoke_connection / list_connections) -- the panel must not implement any
authorization business logic itself. Tests mock AsyncVPNClient directly
(rather than the HTTP layer) since that's the boundary these routes
actually depend on.
"""

from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest

from v2hub.models import ConnectionResponse, ConnectionsResponse, ProviderAuthorizationStatus


def make_connection(
    provider_name: str = "v2hub",
    provider_url: str | None = "https://v2hub.example.com",
    is_authorized: bool = True,
    status: ProviderAuthorizationStatus | None = ProviderAuthorizationStatus.APPROVED,
) -> ConnectionResponse:
    return ConnectionResponse(
        provider_name=provider_name,
        provider_url=provider_url,
        is_authorized=is_authorized,
        status=status,
    )


@pytest.fixture
def mock_client():
    """
    Patches the AsyncVPNClient class used by make_async_client so tests
    control exactly what the "v2hub server" returns, without touching
    the network.
    """
    with patch("v2hub_panel.services.connection.AsyncVPNClient") as MockClient:
        instance = AsyncMock()
        # AsyncVPNClient is used as `async with AsyncVPNClient(...) as client:`
        MockClient.return_value.__aenter__.return_value = instance
        MockClient.return_value.__aexit__.return_value = False
        yield instance


# ═══════════════════════════════════════════════════════════════════════════
# GET (POST) /api/connections/{provider_name}
# ═══════════════════════════════════════════════════════════════════════════


class TestGetConnection:
    def test_approved_connection(self, client, mock_client, creds):
        mock_client.get_connection.return_value = make_connection(
            status=ProviderAuthorizationStatus.APPROVED,
            is_authorized=True,
        )

        resp = client.post("/api/connections/v2hub", json=creds)

        assert resp.status_code == 200
        body = resp.json()
        assert body["provider_name"] == "v2hub"
        assert body["provider_url"] == "https://v2hub.example.com"
        assert body["is_authorized"] is True
        assert body["status"] == "approved"
        mock_client.get_connection.assert_awaited_once_with("v2hub")

    def test_pending_connection(self, client, mock_client, creds):
        mock_client.get_connection.return_value = make_connection(
            status=ProviderAuthorizationStatus.PENDING,
            is_authorized=False,
        )

        resp = client.post("/api/connections/otherprovider", json=creds)

        assert resp.status_code == 200
        body = resp.json()
        assert body["status"] == "pending"
        assert body["is_authorized"] is False
        mock_client.get_connection.assert_awaited_once_with("otherprovider")

    def test_provider_name_from_path_is_forwarded_verbatim(self, client, mock_client, creds):
        """The backend must not rewrite/guess the provider name -- it's
        whatever the frontend read from #editor-provider-badge."""
        mock_client.get_connection.return_value = make_connection(provider_name="weird-Provider_42")

        resp = client.post("/api/connections/weird-Provider_42", json=creds)

        assert resp.status_code == 200
        mock_client.get_connection.assert_awaited_once_with("weird-Provider_42")

    def test_missing_credentials_rejected(self, client):
        resp = client.post("/api/connections/v2hub", json={})
        assert resp.status_code == 422


# ═══════════════════════════════════════════════════════════════════════════
# POST /api/connections/{provider_name}/approve
# ═══════════════════════════════════════════════════════════════════════════


class TestApproveConnection:
    def test_approve_success(self, client, mock_client, creds):
        mock_client.approve_connection.return_value = make_connection(
            status=ProviderAuthorizationStatus.APPROVED,
            is_authorized=True,
        )

        resp = client.post("/api/connections/v2hub/approve", json=creds)

        assert resp.status_code == 200
        assert resp.json()["status"] == "approved"
        mock_client.approve_connection.assert_awaited_once_with("v2hub")

    def test_approve_propagates_max_providers_error(self, client, mock_client, creds):
        """
        MAX_PROVIDERS_PER_USER is enforced server-side; the panel must
        surface that failure, not swallow or reinterpret it.
        """
        from v2hub import VPNAPIError

        error = VPNAPIError("Maximum number of approved providers reached")
        error.status_code = 409
        error.response_data = {
            "detail": {
                "error": "too_many_providers",
                "message": "Maximum number of approved providers reached",
            }
        }
        mock_client.approve_connection.side_effect = error

        resp = client.post("/api/connections/v2hub/approve", json=creds)

        assert resp.status_code == 409
        assert resp.json()["detail"]["error"] == "too_many_providers"

    def test_approve_propagates_not_pending_error(self, client, mock_client, creds):
        from v2hub import VPNAPIError

        error = VPNAPIError("Connection is not pending")
        error.status_code = 409
        error.response_data = {
            "detail": {
                "error": "invalid_authorization_status",
                "message": "Connection is not pending",
            }
        }
        mock_client.approve_connection.side_effect = error

        resp = client.post("/api/connections/v2hub/approve", json=creds)

        assert resp.status_code == 409
        assert resp.json()["detail"]["error"] == "invalid_authorization_status"


# ═══════════════════════════════════════════════════════════════════════════
# POST /api/connections/{provider_name}/reject
# ═══════════════════════════════════════════════════════════════════════════


class TestRejectConnection:
    def test_reject_success(self, client, mock_client, creds):
        mock_client.reject_connection.return_value = make_connection(
            status=ProviderAuthorizationStatus.REVOKED,
            is_authorized=False,
        )

        resp = client.post("/api/connections/v2hub/reject", json=creds)

        assert resp.status_code == 200
        assert resp.json()["status"] == "revoked"
        mock_client.reject_connection.assert_awaited_once_with("v2hub")


# ═══════════════════════════════════════════════════════════════════════════
# POST /api/connections/{provider_name}/revoke
# ═══════════════════════════════════════════════════════════════════════════


class TestRevokeConnection:
    def test_revoke_success_returns_ok(self, client, mock_client, creds):
        mock_client.revoke_connection.return_value = None

        resp = client.post("/api/connections/v2hub/revoke", json=creds)

        assert resp.status_code == 200
        body = resp.json()
        assert body["ok"] is True
        mock_client.revoke_connection.assert_awaited_once_with("v2hub")

    def test_revoke_does_not_touch_subscriptions_endpoint(self, client, mock_client, creds):
        """
        Sanity check that revoke only calls the connection-revoke SDK
        method and never anything subscription-related -- revoking
        authorization must not delete/modify existing subscriptions.
        """
        mock_client.revoke_connection.return_value = None

        client.post("/api/connections/v2hub/revoke", json=creds)

        mock_client.delete_subscription.assert_not_called()
        mock_client.update_subscription.assert_not_called()


# ═══════════════════════════════════════════════════════════════════════════
# POST /api/connections (list)
# ═══════════════════════════════════════════════════════════════════════════


class TestListConnections:
    def test_list_returns_pending_and_approved(self, client, mock_client, creds):
        mock_client.list_connections.return_value = ConnectionsResponse(
            connections=[
                make_connection(
                    provider_name="v2hub",
                    status=ProviderAuthorizationStatus.APPROVED,
                    is_authorized=True,
                ),
                make_connection(
                    provider_name="otherprovider",
                    status=ProviderAuthorizationStatus.PENDING,
                    is_authorized=False,
                ),
            ]
        )

        resp = client.post("/api/connections", json=creds)

        assert resp.status_code == 200
        body = resp.json()
        assert len(body["connections"]) == 2
        statuses = {c["provider_name"]: c["status"] for c in body["connections"]}
        assert statuses == {"v2hub": "approved", "otherprovider": "pending"}

    def test_list_empty(self, client, mock_client, creds):
        mock_client.list_connections.return_value = ConnectionsResponse(connections=[])

        resp = client.post("/api/connections", json=creds)

        assert resp.status_code == 200
        assert resp.json()["connections"] == []
