"""Service layer for settings management."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

from ..config import settings
from .settings_registry import SETTINGS_REGISTRY
from .settings_storage import SettingsStorage

if TYPE_CHECKING:
    from pathlib import Path


SETTINGS_ALIASES: dict[str, str] = {
    "default_background": "default_theme",
}


class SettingsService:
    """Service to interact with registered settings and their storage."""

    def __init__(self, storage: SettingsStorage) -> None:
        self.storage = storage

    def get_public_settings(self) -> dict[str, Any]:
        """Return public settings resolved with defaults."""
        stored = self.storage.get_all_settings()
        result: dict[str, Any] = {}
        for key, definition in SETTINGS_REGISTRY.items():
            if definition.is_public:
                if key in stored:
                    result[key] = stored[key]["value"]
                else:
                    result[key] = definition.default

        # Provide aliases for backwards compatibility (e.g. default_background -> default_theme)
        for alias, target in SETTINGS_ALIASES.items():
            if target in result and alias not in result:
                result[alias] = result[target]

        return result

    def get_all_settings_admin(self) -> list[dict[str, Any]]:
        """Return all registered settings with metadata and current values."""
        stored = self.storage.get_all_settings()
        result = []
        for key, defn in SETTINGS_REGISTRY.items():
            current_value = stored[key]["value"] if key in stored else defn.default
            updated_at = stored[key]["updated_at"] if key in stored else None
            options_data = (
                [
                    {
                        "value": opt.value,
                        "label": opt.label,
                        "description": opt.description,
                        "preview": opt.preview,
                    }
                    for opt in defn.options
                ]
                if defn.options
                else None
            )

            result.append(
                {
                    "key": defn.key,
                    "type": defn.type,
                    "label": defn.label,
                    "description": defn.description,
                    "value": current_value,
                    "default": defn.default,
                    "is_public": defn.is_public,
                    "options": options_data,
                    "updated_at": updated_at,
                }
            )
        return result

    def get_setting(self, key: str) -> Any:
        """Get single setting value resolved with default."""
        target_key = SETTINGS_ALIASES.get(key, key)
        if target_key not in SETTINGS_REGISTRY:
            return None
        stored = self.storage.get_setting(target_key)
        if stored:
            return stored["value"]
        return SETTINGS_REGISTRY[target_key].default

    def update_setting(self, key: str, value: Any) -> dict[str, Any]:
        """Validate and persist setting."""
        target_key = SETTINGS_ALIASES.get(key, key)
        if target_key not in SETTINGS_REGISTRY:
            raise KeyError(f"Unknown setting: {key}")

        defn = SETTINGS_REGISTRY[target_key]
        if defn.validator:
            valid, err_msg = defn.validator(value)
            if not valid:
                raise ValueError(err_msg or "Invalid setting value")

        if defn.normalizer:
            val_str = defn.normalizer(value)
        elif isinstance(value, str):
            val_str = value.strip().lower()
        else:
            val_str = str(value)
        self.storage.set_setting(target_key, val_str, defn.type)
        return {
            "key": target_key,
            "value": val_str,
            "type": defn.type,
            "label": defn.label,
        }

    def reset_setting(self, key: str) -> None:
        """Reset a setting to its default value."""
        target_key = SETTINGS_ALIASES.get(key, key)
        if target_key in SETTINGS_REGISTRY:
            self.storage.delete_setting(target_key)


_settings_service: SettingsService | None = None


def get_settings_service(db_path: Path | None = None) -> SettingsService:
    """Return singleton instance of SettingsService."""
    global _settings_service
    if _settings_service is None or db_path is not None:
        path = db_path or settings.database_path
        storage = SettingsStorage(path)
        service = SettingsService(storage)
        if db_path is None:
            _settings_service = service
        return service
    return _settings_service
