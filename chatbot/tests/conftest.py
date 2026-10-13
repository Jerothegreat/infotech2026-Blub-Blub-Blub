from pathlib import Path

import pytest
from langchain_core.runnables import RunnableLambda

from heronsguide.chains import FriendlyReply, GroundedAnswer, GuardResult, Models, RewriteResult
from heronsguide.kb import load_sections
from heronsguide.log import QueryLog
from heronsguide.pipeline import HeronsGuideBot

KB_DIR = Path(__file__).resolve().parents[1] / "kb"


@pytest.fixture(scope="session")
def sections():
    return load_sections(KB_DIR)


class Stub:
    """Stands in for one Gemini call: records each prompt and returns a canned reply."""

    def __init__(self, reply):
        self.reply = reply
        self.prompts: list[str] = []

    def __call__(self, prompt_value):
        self.prompts.append(prompt_value.to_string())
        return self.reply

    @property
    def calls(self) -> int:
        return len(self.prompts)


class Stubs:
    def __init__(self, guard, rewrite, answer, conversation):
        self.guard = Stub(GuardResult(verdict=guard))
        self.rewrite = Stub(rewrite)
        self.answer = Stub(answer)
        self.conversation = Stub(conversation)

    def models(self) -> Models:
        return Models(
            guard=RunnableLambda(self.guard),
            rewrite=RunnableLambda(self.rewrite),
            answer=RunnableLambda(self.answer),
            conversation=RunnableLambda(self.conversation),
        )


def grounded(status="answered", text="85% and above GWA.", citations=("Source02-s002",), note=None):
    return GroundedAnswer(status=status, answer=text, citations=list(citations), conflict_note=note)


@pytest.fixture
def make_bot(sections, tmp_path):
    def _make(
        answer: GroundedAnswer | None = None,
        *,
        guard: str = "valid",
        query: str = "What GWA is required for BS Computer Science?",
        language: str = "English",
        reply: str | None = None,
        follow_ups: tuple[str, ...] = ("What documents do I need?", "Where is that office?"),
        log: bool = False,
    ):
        answer = answer or grounded()
        stubs = Stubs(
            guard,
            RewriteResult(query=query, language=language),
            answer,
            FriendlyReply(
                reply=reply if reply is not None else f"Sure! {answer.answer}",
                follow_ups=list(follow_ups),
            ),
        )
        bot = HeronsGuideBot(sections, stubs.models(), QueryLog(tmp_path / "q.db") if log else None)
        return bot, stubs

    return _make
