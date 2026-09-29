"""Settings registry and schema definition."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from collections.abc import Callable


@dataclass
class SettingOption:
    value: str
    label: str
    description: str | None = None
    preview: str | None = None


@dataclass
class SettingDefinition:
    key: str
    type: str  # "select", "string", "image", "boolean", "number"
    default: Any
    label: str
    description: str
    is_public: bool = True
    options: list[SettingOption] = field(default_factory=list)
    validator: Callable[[Any], tuple[bool, str | None]] | None = None


# Theme options: only dark and light themes are supported
THEME_OPTIONS = [
    SettingOption(
        value="dark",
        label="Dark Theme",
        description="Standard dark palette for the panel",
        preview="#0d1727",
    ),
    SettingOption(
        value="light",
        label="Light Theme",
        description="Clean light palette for the panel",
        preview="#f8fafc",
    ),
]

VALID_THEMES = {"dark", "light"}


def validate_theme(val: Any) -> tuple[bool, str | None]:
    if not isinstance(val, str) or not val.strip():
        return False, "Theme setting cannot be empty"
    val = val.strip().lower()
    if val in VALID_THEMES:
        return True, None
    return (
        False,
        f"Theme must be either 'dark' or 'light' (received '{val}')",
    )


SETTINGS_REGISTRY: dict[str, SettingDefinition] = {
    "default_theme": SettingDefinition(
        key="default_theme",
        type="select",
        default="dark",
        label="Default Theme",
        description="Panel-wide default theme (dark or light)",
        is_public=True,
        options=THEME_OPTIONS,
        validator=validate_theme,
    ),
}
