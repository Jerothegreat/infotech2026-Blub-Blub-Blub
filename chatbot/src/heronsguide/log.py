"""Query log for admin insights (top questions, gap list). No names or user ids (NFR-03)."""

import json
import sqlite3
from datetime import UTC, datetime
from pathlib import Path

_SCHEMA = """
CREATE TABLE IF NOT EXISTS queries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    asked_at TEXT NOT NULL,
    channel TEXT NOT NULL,
    college TEXT,
    question TEXT NOT NULL,
    query TEXT,
    status TEXT NOT NULL,
    citations TEXT NOT NULL
)
"""


class QueryLog:
    def __init__(self, db_path: Path):
        self.db_path = db_path
        db_path.parent.mkdir(parents=True, exist_ok=True)
        with self._connect() as db:
            db.execute(_SCHEMA)
            columns = {row[1] for row in db.execute("PRAGMA table_info(queries)")}
            if "query" not in columns:  # logs created before the rewrite step
                db.execute("ALTER TABLE queries ADD COLUMN query TEXT")

    def _connect(self) -> sqlite3.Connection:
        return sqlite3.connect(self.db_path)

    def record(
        self,
        *,
        question: str,
        query: str | None,
        college: str | None,
        channel: str,
        status: str,
        citations: list[str],
    ) -> None:
        with self._connect() as db:
            db.execute(
                "INSERT INTO queries "
                "(asked_at, channel, college, question, query, status, citations) "
                "VALUES (?, ?, ?, ?, ?, ?, ?)",
                (
                    datetime.now(UTC).isoformat(timespec="seconds"),
                    channel,
                    college,
                    question,
                    query,
                    status,
                    json.dumps(citations),
                ),
            )

    def gaps(self, limit: int = 50) -> list[dict]:
        """Refused questions, newest first: what admins should upload next (FR4.2)."""
        with self._connect() as db:
            db.row_factory = sqlite3.Row
            rows = db.execute(
                "SELECT asked_at, channel, college, question, query FROM queries "
                "WHERE status = 'not_in_sources' ORDER BY id DESC LIMIT ?",
                (limit,),
            ).fetchall()
        return [dict(r) for r in rows]
