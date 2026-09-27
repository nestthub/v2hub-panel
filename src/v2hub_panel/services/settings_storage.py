"""SQLite-backed key-value settings storage."""

from __future__ import annotations

import sqlite3
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from pathlib import Path


class SettingsStorage:
    """Lightweight key-value settings storage using SQLite."""

    def __init__(self, db_path: Path) -> None:
        self.db_path = db_path
        self._init_db()

    def _get_connection(self) -> sqlite3.Connection:
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        conn = sqlite3.connect(str(self.db_path), check_same_thread=False)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self) -> None:
        with self._get_connection() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS settings (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL,
                    type TEXT NOT NULL,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                """
            )
            conn.commit()

    def get_setting(self, key: str) -> dict[str, Any] | None:
        with self._get_connection() as conn:
            cursor = conn.execute(
                "SELECT key, value, type, updated_at FROM settings WHERE key = ?",
                (key,),
            )
            row = cursor.fetchone()
            if not row:
                return None
            return {
                "key": str(row["key"]),
                "value": str(row["value"]),
                "type": str(row["type"]),
                "updated_at": str(row["updated_at"]),
            }

    def get_all_settings(self) -> dict[str, dict[str, Any]]:
        with self._get_connection() as conn:
            cursor = conn.execute("SELECT key, value, type, updated_at FROM settings")
            rows = cursor.fetchall()
            return {
                str(row["key"]): {
                    "key": str(row["key"]),
                    "value": str(row["value"]),
                    "type": str(row["type"]),
                    "updated_at": str(row["updated_at"]),
                }
                for row in rows
            }

    def set_setting(self, key: str, value: str, setting_type: str) -> None:
        with self._get_connection() as conn:
            conn.execute(
                """
                INSERT INTO settings (key, value, type, updated_at)
                VALUES (?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(key) DO UPDATE SET
                    value = excluded.value,
                    type = excluded.type,
                    updated_at = CURRENT_TIMESTAMP;
                """,
                (key, value, setting_type),
            )
            conn.commit()

    def delete_setting(self, key: str) -> bool:
        with self._get_connection() as conn:
            cursor = conn.execute("DELETE FROM settings WHERE key = ?", (key,))
            conn.commit()
            return cursor.rowcount > 0
