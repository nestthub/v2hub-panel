"""Provider connection service — stateless, per-request.

Thin serialization layer over the v2hub SDK's provider-connection
methods (get_connection / approve_connection / reject_connection /
revoke_connection / list_connections). All authorization business logic
(PENDING -> APPROVED/REVOKED transitions, MAX_PROVIDERS_PER_USER, etc.)
lives on the v2hub server behind the SDK -- this module only reshapes
the SDK's response into the panel's own response model so the frontend
API contract doesn't change if the SDK's does.
"""

from __future__ import annotations

from enum import Enum
from typing import TYPE_CHECKING

from ..models import ProviderConnectionInfo

if TYPE_CHECKING:
    from v2hub.models.me import ConnectionResponse


def serialize_connection(connection: ConnectionResponse) -> ProviderConnectionInfo:
    status = connection.status
    # ConnectionResponse.status is typed as ProviderAuthorizationStatus | None,
    # but depending on the SDK's pydantic config it may already come through
    # as a plain str (enum value) rather than the Enum member -- handle both
    # rather than assuming .value is always present.
    status_value = status.value if isinstance(status, Enum) else status

    return ProviderConnectionInfo(
        provider_name=connection.provider_name,
        provider_url=connection.provider_url,
        is_authorized=connection.is_authorized,
        status=status_value,
    )
