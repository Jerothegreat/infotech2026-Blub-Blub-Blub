"""Runtime settings, read from environment variables (and chatbot/.env when present)."""

import os
from dataclasses import dataclass, field
from pathlib import Path

from dotenv import load_dotenv

CHATBOT_DIR = Path(__file__).resolve().parents[2]

load_dotenv(CHATBOT_DIR / ".env")


def _ids(name: str) -> frozenset[int]:
    raw = os.getenv(name, "")
    return frozenset(int(v) for v in raw.replace(" ", "").split(",") if v.lstrip("-").isdigit())


def _origins() -> list[str]:
    raw = os.getenv("ALLOWED_ORIGINS", "http://localhost:8787,http://127.0.0.1:8787")
    return [o.strip() for o in raw.split(",") if o.strip()]


@dataclass(frozen=True)
class Settings:
    google_api_key: str | None = field(default_factory=lambda: os.getenv("GOOGLE_API_KEY"))
    gemini_model: str = field(default_factory=lambda: os.getenv("GEMINI_MODEL", "gemini-3.5-flash"))
    kb_dir: Path = field(default_factory=lambda: Path(os.getenv("KB_DIR", str(CHATBOT_DIR / "kb"))))
    db_path: Path = field(
        default_factory=lambda: Path(
            os.getenv("QUERY_LOG_PATH", str(CHATBOT_DIR / "data" / "queries.db"))
        )
    )
    allowed_origins: list[str] = field(default_factory=_origins)
    student_demo_token: str = field(
        default_factory=lambda: os.getenv("STUDENT_DEMO_TOKEN", "demo-student")
    )
    sample_account_path: Path = field(
        default_factory=lambda: Path(
            os.getenv("SAMPLE_ACCOUNT_PATH", str(CHATBOT_DIR / "samples" / "sample_account.json"))
        )
    )
    telegram_bot_token: str | None = field(default_factory=lambda: os.getenv("TELEGRAM_BOT_TOKEN"))
    telegram_bot_username: str | None = field(
        default_factory=lambda: os.getenv("TELEGRAM_BOT_USERNAME")
    )
    # Telegram user ids (see /whoami) signed in as the sample student, like the TBL Hub demo
    telegram_demo_user_ids: frozenset[int] = field(
        default_factory=lambda: _ids("TELEGRAM_DEMO_USER_IDS")
    )

    @property
    def telegram_url(self) -> str | None:
        if not self.telegram_bot_username:
            return None
        return f"https://t.me/{self.telegram_bot_username.lstrip('@')}"


def get_settings() -> Settings:
    return Settings()
