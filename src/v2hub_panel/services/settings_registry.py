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


# Background presets with CSS gradient previews
BACKGROUND_PRESETS = [
    SettingOption(
        value="default",
        label="Default Glow",
        description="Standard dark blue radial glow",
        preview="radial-gradient(1100px 760px at 10% -5%, rgba(92, 167, 255, 0.2), transparent 44%), linear-gradient(180deg, #08111f, #0d1727)",
    ),
    SettingOption(
        value="midnight",
        label="Midnight Abyss",
        description="Deep pitch black with subtle indigo accent",
        preview="linear-gradient(180deg, #05070f, #0a0e1a)",
    ),
    SettingOption(
        value="aurora",
        label="Aurora Borealis",
        description="Emerald green and teal atmospheric gradient",
        preview="radial-gradient(900px 700px at 50% 0%, rgba(74, 222, 128, 0.15), transparent 50%), linear-gradient(180deg, #061510, #08111f)",
    ),
    SettingOption(
        value="sunset",
        label="Cyber Sunset",
        description="Purple and orange dusk horizon",
        preview="radial-gradient(900px 600px at 80% 10%, rgba(251, 146, 60, 0.15), transparent 45%), radial-gradient(800px 600px at 20% 90%, rgba(167, 139, 250, 0.15), transparent 45%), linear-gradient(180deg, #0f0c1b, #150d22)",
    ),
]


def validate_background(val: Any) -> tuple[bool, str | None]:
    if not isinstance(val, str) or not val.strip():
        return False, "Background setting cannot be empty"
    val = val.strip()
    preset_keys = {opt.value for opt in BACKGROUND_PRESETS}
    if val in preset_keys:
        return True, None
    if val.startswith(("/uploads/", "http://", "https://", "data:image/")):
        return True, None
    return (
        False,
        f"Background must be a preset ({', '.join(sorted(preset_keys))}) "
        "or an image URL starting with /uploads/, http://, or https://",
    )


SETTINGS_REGISTRY: dict[str, SettingDefinition] = {
    "default_background": SettingDefinition(
        key="default_background",
        type="select",
        default="default",
        label="Default Background",
        description="Panel-wide background theme or custom image",
        is_public=True,
        options=BACKGROUND_PRESETS,
        validator=validate_background,
    ),
}
