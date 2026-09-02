"""Provider connection endpoints — async, stateless, one client per request.

Proxies the v2hub SDK's provider-connection methods 1:1. The panel does
not implement any provider status/business logic itself (PENDING vs
APPROVED transitions, MAX_PROVIDERS_PER_USER, etc.) -- the v2hub server
is the sole source of truth; this layer only forwards the request and
serializes the response.
"""

from __future__ import annotations

from fastapi import APIRouter

from ..models import (
    ListSubscriptionsRequest,
    OkResponse,
    ProviderConnectionInfo,
    ProviderConnectionListResponse,
)
from ..services.connection import make_async_client
from ..services.provider import serialize_connection
from ..utils import with_error_mapping

router = APIRouter(prefix="/api/connections", tags=["providers"])


@router.post("", response_model=ProviderConnectionListResponse)
async def list_connections(
    payload: ListSubscriptionsRequest,
) -> ProviderConnectionListResponse:
    """List the current user's provider connections (pending + approved)."""
    async with make_async_client(payload.base_url, payload.api_token) as client:
        result = await with_error_mapping(client.list_connections)

    return ProviderConnectionListResponse(
        connections=[serialize_connection(c) for c in result.connections],
    )


@router.post("/{provider_name}", response_model=ProviderConnectionInfo)
async def get_connection(
    provider_name: str,
    payload: ListSubscriptionsRequest,
) -> ProviderConnectionInfo:
    """Get the current user's connection status for a single provider."""
    async with make_async_client(payload.base_url, payload.api_token) as client:
        connection = await with_error_mapping(client.get_connection, provider_name)

    return serialize_connection(connection)


@router.post("/{provider_name}/approve", response_model=ProviderConnectionInfo)
async def approve_connection(
    provider_name: str,
    payload: ListSubscriptionsRequest,
) -> ProviderConnectionInfo:
    """
    Approve a pending provider connection request.

    Subject to the server-side MAX_PROVIDERS_PER_USER limit -- enforced
    exclusively by the v2hub server, not duplicated here.
    """
    async with make_async_client(payload.base_url, payload.api_token) as client:
        connection = await with_error_mapping(client.approve_connection, provider_name)

    return serialize_connection(connection)


@router.post("/{provider_name}/reject", response_model=ProviderConnectionInfo)
async def reject_connection(
    provider_name: str,
    payload: ListSubscriptionsRequest,
) -> ProviderConnectionInfo:
    """Reject a pending provider connection request."""
    async with make_async_client(payload.base_url, payload.api_token) as client:
        connection = await with_error_mapping(client.reject_connection, provider_name)

    return serialize_connection(connection)


@router.post("/{provider_name}/revoke", response_model=OkResponse)
async def revoke_connection(
    provider_name: str,
    payload: ListSubscriptionsRequest,
) -> OkResponse:
    """
    Revoke the current user's provider authorization.

    Existing subscriptions from that provider are left untouched by the
    server -- revoking only changes the authorization record.
    """
    async with make_async_client(payload.base_url, payload.api_token) as client:
        await with_error_mapping(client.revoke_connection, provider_name)

    return OkResponse(ok=True, message="Provider authorization revoked")
