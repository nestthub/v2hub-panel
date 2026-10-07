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
    # Optional canonicalisation applied before the value is persisted
    # (default behaviour: strip + lower-case strings).
    normalizer: Callable[[Any], str] | None = None


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


# Interface languages. To add a language on the backend, append one entry
# here (the frontend counterpart is a single locale file, see
# frontend/scripts/i18n/locales/).
LANGUAGE_OPTIONS = [
    SettingOption(value="en", label="English", description="Default language"),
    SettingOption(value="ru", label="Русский", description="Russian"),
    SettingOption(value="fa", label="فارسی", description="Persian (right-to-left layout)"),
    SettingOption(value="zh-CN", label="简体中文", description="Simplified Chinese"),
]

DEFAULT_LANGUAGE = "en"

# lower-cased code -> canonical code (e.g. "zh-cn" -> "zh-CN")
_CANONICAL_LANGUAGES = {opt.value.lower(): opt.value for opt in LANGUAGE_OPTIONS}


def normalize_language(val: Any) -> str:
    """Return the canonical language code (e.g. ``zh-cn`` -> ``zh-CN``)."""
    key = str(val).strip().replace("_", "-").lower()
    return _CANONICAL_LANGUAGES.get(key, DEFAULT_LANGUAGE)


def validate_language(val: Any) -> tuple[bool, str | None]:
    if not isinstance(val, str) or not val.strip():
        return False, "Language setting cannot be empty"
    key = val.strip().replace("_", "-").lower()
    if key in _CANONICAL_LANGUAGES:
        return True, None
    supported = ", ".join(opt.value for opt in LANGUAGE_OPTIONS)
    return (
        False,
        f"Language must be one of: {supported} (received '{val.strip()}')",
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
    "default_language": SettingDefinition(
        key="default_language",
        type="select",
        default=DEFAULT_LANGUAGE,
        label="Default Language",
        description=(
            "Panel-wide default interface language. Used when the visitor has "
            "not chosen a language and the browser/Telegram language is not "
            "supported"
        ),
        is_public=True,
        options=LANGUAGE_OPTIONS,
        validator=validate_language,
        normalizer=normalize_language,
    ),
}
