"""The four chains, each `prompt | model`:

    ① guard_chain        is this message valid/safe?            -> GuardResult
    ② rewrite_chain      translate/normalize to a standalone query -> RewriteResult
    ③ answer_chain       retrieval-grounded factual answer        -> GroundedAnswer
    ④ conversation_chain same facts, warm tone, user's language   -> FriendlyReply

`Models` holds the four model runnables so tests can swap Gemini for stubs.
"""

from dataclasses import dataclass
from typing import Literal

from langchain_core.runnables import Runnable
from pydantic import BaseModel, Field

from .prompts import ANSWER_PROMPT, CONVERSATION_PROMPT, GUARD_PROMPT, REWRITE_PROMPT


class GuardResult(BaseModel):
    verdict: Literal["valid", "greeting", "invalid"] = Field(
        description="valid (asks for information), greeting (small talk only), or invalid"
    )


class RewriteResult(BaseModel):
    query: str = Field(description="One standalone English search question. Never an answer.")
    language: str = Field(description="Language the user wrote in, e.g. English, Filipino")


class GroundedAnswer(BaseModel):
    status: Literal["answered", "conflict", "not_in_sources"] = Field(
        description="answered, conflict (sources disagree), or not_in_sources"
    )
    answer: str = Field(description="The answer, using only the sources. Empty if not_in_sources.")
    citations: list[str] = Field(description="Ids of every <source> section the answer used.")
    conflict_note: str | None = Field(
        default=None, description="One sentence describing the conflict, only when status=conflict."
    )


class FriendlyReply(BaseModel):
    reply: str = Field(description="The chat reply: same facts, warm tone.")
    follow_ups: list[str] = Field(
        default=[], description="2-3 short next questions the student might ask."
    )


@dataclass(frozen=True)
class Models:
    guard: Runnable  # prompt -> GuardResult
    rewrite: Runnable  # prompt -> RewriteResult
    answer: Runnable  # prompt -> GroundedAnswer
    conversation: Runnable  # prompt -> FriendlyReply


@dataclass(frozen=True)
class Chains:
    guard: Runnable
    rewrite: Runnable
    answer: Runnable
    conversation: Runnable

    @classmethod
    def from_models(cls, m: Models) -> "Chains":
        return cls(
            guard=GUARD_PROMPT | m.guard,
            rewrite=REWRITE_PROMPT | m.rewrite,
            answer=ANSWER_PROMPT | m.answer,
            conversation=CONVERSATION_PROMPT | m.conversation,
        )


def gemini_models(api_key: str | None, model: str) -> Models:
    from langchain_google_genai import ChatGoogleGenerativeAI

    if not api_key:
        raise RuntimeError("GOOGLE_API_KEY is not set. Copy chatbot/.env.example to chatbot/.env.")
    strict = ChatGoogleGenerativeAI(
        model=model, google_api_key=api_key, temperature=0, max_retries=2
    )
    warm = ChatGoogleGenerativeAI(
        model=model, google_api_key=api_key, temperature=0.4, max_retries=2
    )
    return Models(
        guard=strict.with_structured_output(GuardResult),
        rewrite=strict.with_structured_output(RewriteResult),
        answer=strict.with_structured_output(GroundedAnswer),
        conversation=warm.with_structured_output(FriendlyReply),
    )
