"""HTTP API shared by every channel (TBL Hub widget, Telegram, future clients).

Run: uv run uvicorn heronsguide.api:app --reload
"""

import json
import logging
import queue
import threading
from functools import lru_cache
from typing import Annotated, Literal

from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, RedirectResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from .account import (
    AccountProvider,
    AccountView,
    SampleAccountProvider,
    StudentRecord,
    account_view,
)
from .config import CHATBOT_DIR, get_settings
from .kb import COLLEGES
from .pipeline import MAX_HISTORY, ChatResult, HeronsGuideBot, build_bot

logger = logging.getLogger("heronsguide")
settings = get_settings()

app = FastAPI(title="HeronsGuide Chat", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "X-Student-Token"],
)


UNAVAILABLE = "The assistant is unavailable right now. Please try again."


@lru_cache
def _bot() -> HeronsGuideBot:
    return build_bot()


def get_bot() -> HeronsGuideBot:
    try:
        return _bot()
    except Exception as err:  # e.g. GOOGLE_API_KEY missing
        logger.exception("bot setup failed")
        raise HTTPException(503, UNAVAILABLE) from err


@lru_cache
def get_accounts() -> AccountProvider:
    return SampleAccountProvider(settings.sample_account_path, settings.student_demo_token)


StudentToken = Annotated[str | None, Header(alias="X-Student-Token")]


def get_account(
    accounts: Annotated[AccountProvider, Depends(get_accounts)],
    token: StudentToken = None,
) -> StudentRecord | None:
    """The signed-in student's records, or None for guests and unknown tokens."""
    return accounts.get(token)


class Turn(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(max_length=4000)


class ChatRequest(BaseModel):
    question: str = Field(min_length=1, max_length=1000)
    college: str | None = None
    channel: Literal["tbl", "telegram", "web"] = "tbl"
    history: list[Turn] = Field(default=[], max_length=50)  # earlier turns of this thread


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.get("/config")
def config() -> dict:
    """What a client needs to render the chat: college list and Telegram link."""
    return {
        "colleges": [{"code": c, "name": n} for c, n in COLLEGES.items()],
        "telegram_url": settings.telegram_url,
    }


@app.get("/account/me")
def account_me(account: Annotated[StudentRecord | None, Depends(get_account)]) -> AccountView:
    """The "My account" tab: classes, deadlines, grades and assessment. Never personal details."""
    if account is None:
        raise HTTPException(401, "Sign in to TBL Hub to see your account.")
    return account_view(account)


@app.post("/chat")
def chat(
    req: ChatRequest,
    bot: Annotated[HeronsGuideBot, Depends(get_bot)],
    account: Annotated[StudentRecord | None, Depends(get_account)],
) -> ChatResult:
    question = req.question.strip()
    if not question:
        raise HTTPException(422, "Question is empty.")
    try:
        history = [t.model_dump() for t in req.history[-MAX_HISTORY:]]
        return bot.ask(
            question,
            college=req.college,
            channel=req.channel,
            history=history,
            account=account,
        )
    except Exception as err:
        logger.exception("chat failed")
        raise HTTPException(503, UNAVAILABLE) from err


@app.post("/chat/stream")
def chat_stream(
    req: ChatRequest,
    bot: Annotated[HeronsGuideBot, Depends(get_bot)],
    account: Annotated[StudentRecord | None, Depends(get_account)],
) -> StreamingResponse:
    """Same as /chat, streamed as NDJSON: one {"type": "step"} line per pipeline step as it
    finishes (the widget's live "Show thinking"), then {"type": "result"} or {"type": "error"}."""
    question = req.question.strip()
    if not question:
        raise HTTPException(422, "Question is empty.")
    history = [t.model_dump() for t in req.history[-MAX_HISTORY:]]
    events: queue.Queue = queue.Queue()

    def run() -> None:
        try:
            result = bot.ask(
                question,
                college=req.college,
                channel=req.channel,
                history=history,
                account=account,
                on_step=lambda s: events.put({"type": "step", **s.model_dump()}),
            )
            events.put({"type": "result", **result.model_dump()})
        except Exception:
            logger.exception("chat stream failed")
            events.put({"type": "error", "message": UNAVAILABLE})
        events.put(None)

    threading.Thread(target=run, daemon=True).start()

    def lines():
        while (event := events.get()) is not None:
            yield json.dumps(event, ensure_ascii=False) + "\n"

    return StreamingResponse(lines(), media_type="application/x-ndjson")


@app.get("/widget.js", include_in_schema=False)
def widget_js() -> FileResponse:
    return FileResponse(CHATBOT_DIR / "widget" / "widget.js", media_type="text/javascript")


@app.get("/", include_in_schema=False)
def root() -> RedirectResponse:
    return RedirectResponse("/demo/tbl-hub/")


app.mount("/widget", StaticFiles(directory=CHATBOT_DIR / "widget"), name="widget")
app.mount("/demo", StaticFiles(directory=CHATBOT_DIR / "demo", html=True), name="demo")
