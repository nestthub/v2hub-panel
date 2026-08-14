"""V2Hub Mini App - Professional VPN subscription management application."""

from importlib.metadata import PackageNotFoundError, version

from .main import app

try:
    __version__ = version("v2hub-panel")
except PackageNotFoundError:
    __version__ = "unknown"

__all__ = ["app"]
