"""HeronsGuide message pipeline.

user message (+ thread history)
  │
  ├─▶ ① guard_chain ──┐   (run in parallel)
  ├─▶ ② rewrite_chain ┘
  │        greeting → friendly canned reply      invalid → polite redirect
  ▼
retrieval: ScopedSectionRetriever (student's college + University-wide sections)
  ▼
③ answer_chain → grounding gate (citations must be provided sections, else exact fallback)
  ▼
④ conversation_chain → warm reply in the user's language; kept only if every number survives
  ▼
final reply + citations → query log
"""

import re
from collections.abc import Callable, Sequence
from datetime import date
from typing import Literal

from langchain_core.documents import Document
from langchain_core.runnables import RunnableParallel
from pydantic import BaseModel

from .account import StudentRecord, account_sections
from .chains import Chains, GroundedAnswer, Models, gemini_models
from .kb import normalize_college
from .log import QueryLog
from .prompts import escape, format_history, format_sources, scope_note
from .retriever import ScopedSectionRetriever

FALLBACK = "Information not in provided sources"
MAX_HISTORY = 10

Status = Literal["answered", "conflict", "not_in_sources", "greeting", "invalid"]

GREETING = {
    "filipino": "Hello! Ako si HeronsGuide. Magtanong ka tungkol sa UMak scholarships, admission "
    "requirements, offices, o kung saan makikita ang isang opisina.",
    "default": "Hi! I'm HeronsGuide. Ask me about UMak scholarships, admission requirements, "
    "offices, or where to find an office on campus.",
}
INVALID = (
    "I can only help with questions about UMak scholarships, admission requirements, offices "
    "and campus locations. Could you ask it another way?"
)

_NUMBER = re.compile(r"\d+(?:\.\d+)?")
_URL = re.compile(r"https?://[^\s<>()\"']+[^\s<>()\"'.,;:!?]")

VERDICT_LABEL = {
    "valid": "A question to look up",
    "greeting": "A greeting, no lookup needed",
    "invalid": "Outside what HeronsGuide can help with",
}
ANSWER_LABEL = {
    "answered": "Found an answer in the sections",
    "conflict": "Found sections that disagree",
    "not_in_sources": "The sections don't cover this",
}


class Citation(BaseModel):
    id: str
    source: str
    section: str


class Step(BaseModel):
    """One visible line of "Show thinking": what a pipeline step did, never hidden reasoning."""

    key: Literal["guard", "rewrite", "retrieve", "answer", "verify", "tone"]
    label: str
    detail: str = ""


class ChatResult(BaseModel):
    status: Status
    answer: str
    citations: list[Citation]
    conflict_note: str | None = None
    query: str | None = None  # ② rewritten standalone query
    language: str | None = None
    follow_ups: list[str] = []
    steps: list[Step] = []


def refusal(query: str | None = None, language: str | None = None) -> ChatResult:
    return ChatResult(
        status="not_in_sources", answer=FALLBACK, citations=[], query=query, language=language
    )


def apply_gate(raw: GroundedAnswer, provided: dict[str, Document]) -> ChatResult:
    """Block anything the sources do not back: no answer, no citation, or an unknown citation."""
    ids = list(dict.fromkeys(raw.citations))
    if (
        raw.status == "not_in_sources"
        or not raw.answer.strip()
        or not ids
        or any(i not in provided for i in ids)
    ):
        return refusal()
    return ChatResult(
        status=raw.status,
        answer=raw.answer.strip(),
        citations=[
            Citation(
                id=i,
                source=provided[i].metadata["source"],
                section=provided[i].metadata["section"],
            )
            for i in ids
        ],
        conflict_note=raw.conflict_note if raw.status == "conflict" else None,
    )


def keeps_facts(factual: str, friendly: str) -> bool:
    """The friendly rewrite may change wording, never numbers (GWAs, percentages, rooms...)
    or links (Google Meet URLs)."""
    found = set(_NUMBER.findall(friendly))
    links = set(_URL.findall(friendly))
    return (
        bool(friendly.strip())
        and all(n in found for n in _NUMBER.findall(factual))
        and all(u in links for u in _URL.findall(factual))
    )


class HeronsGuideBot:
    def __init__(self, sections: list[Document], models: Models, log: QueryLog | None = None):
        self.sections = sections
        self.chains = Chains.from_models(models)
        self.log = log

    def ask(
        self,
        question: str,
        college: str | None = None,
        channel: str = "tbl",
        history: Sequence[dict] = (),
        account: StudentRecord | None = None,
        on_step: Callable[[Step], None] | None = None,
    ) -> ChatResult:
        steps: list[Step] = []

        def step(key: str, label: str, detail: str = "") -> None:
            s = Step(key=key, label=label, detail=detail)
            steps.append(s)
            if on_step:
                on_step(s)

        college = normalize_college(college) or (account.profile.college if account else None)
        history_text = format_history(list(history)[-MAX_HISTORY:])
        inputs = {"question": escape(question), "history": history_text}

        # ① guard and ② rewrite are independent, so run them together.
        first = RunnableParallel(guard=self.chains.guard, rewrite=self.chains.rewrite).invoke(
            inputs
        )
        verdict, rewrite = first["guard"].verdict, first["rewrite"]
        language = rewrite.language or "English"
        step("guard", "Checked the message", VERDICT_LABEL[verdict])
        if verdict == "valid":
            step("rewrite", "Understood the question", f'"{rewrite.query}" ({language})')

        if verdict == "greeting":
            key = (
                "filipino" if language.lower() in ("filipino", "tagalog", "taglish") else "default"
            )
            result = ChatResult(
                status="greeting", answer=GREETING[key], citations=[], language=language
            )
        elif verdict == "invalid":
            result = ChatResult(status="invalid", answer=INVALID, citations=[], language=language)
        else:
            result = self._answer(rewrite.query, college, language, inputs, account, step)

        if self.log:
            self.log.record(
                question=question,
                query=result.query,
                college=college,
                channel=channel,
                status=result.status,
                citations=[c.id for c in result.citations],
            )
        result.steps = steps
        return result

    def _answer(
        self,
        query: str,
        college: str | None,
        language: str,
        inputs: dict,
        account: StudentRecord | None,
        step: Callable[..., None],
    ) -> ChatResult:
        # Retrieval (+ the signed-in student's own records), then ③ answer_chain and the gate.
        context = ScopedSectionRetriever(sections=self.sections, college=college).invoke(query)
        if account:
            context = account_sections(account) + context
        today = (account.as_of if account else date.today()).strftime("%A, %d %B %Y")
        files = sorted({d.metadata["source"] for d in context if d.metadata["tenant"] != "Account"})
        scope = f"{college} and University-wide" if college else "all colleges"
        step(
            "retrieve",
            f"Looked through {len(context)} sections",
            f"{', '.join(files)} ({scope})" + (" + your TBL Hub records" if account else ""),
        )
        raw = self.chains.answer.invoke(
            {
                "sources": format_sources(context),
                "question": escape(query),
                "scope_note": scope_note(college, today),
            }
        )
        step("answer", "Drafted an answer from the sections", ANSWER_LABEL[raw.status])
        result = apply_gate(raw, {d.metadata["id"]: d for d in context})
        result.query, result.language = query, language
        if result.status == "not_in_sources":
            step("verify", "Checked the citations", "Nothing in the sources backs an answer")
            return result  # the exact fallback is never rephrased (FR1.3)
        step(
            "verify",
            f"Verified {len(result.citations)} citation"
            + ("s" if len(result.citations) != 1 else ""),
            "; ".join(f"{c.source} › {c.section.split(' › ')[-1]}" for c in result.citations),
        )

        # ④ conversation_chain: warm tone, same facts.
        friendly = self.chains.conversation.invoke(
            {
                **inputs,
                "answer": escape(result.answer),
                "language": language,
                "cited": escape("\n".join(f"{c.source} › {c.section}" for c in result.citations)),
            }
        )
        result.follow_ups = [q.strip() for q in friendly.follow_ups if q.strip()][:3]
        if keeps_facts(result.answer, friendly.reply):
            result.answer = friendly.reply.strip()
            step("tone", "Wrote a friendly reply", f"In {language}; every number kept")
        else:
            step("tone", "Kept the checked wording", "The friendly rewrite changed a number")
        return result


def build_bot() -> HeronsGuideBot:
    from .config import get_settings
    from .kb import load_sections

    settings = get_settings()
    return HeronsGuideBot(
        sections=load_sections(settings.kb_dir),
        models=gemini_models(settings.google_api_key, settings.gemini_model),
        log=QueryLog(settings.db_path),
    )
