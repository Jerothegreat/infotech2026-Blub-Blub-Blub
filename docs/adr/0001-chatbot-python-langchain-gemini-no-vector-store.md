# 0001: Chatbot as a Python LangChain service on Gemini, without a vector store

**Status:** Accepted
**Date:** 2026-10-13

## Context

The chatbot (FR1, FR2.1–FR2.2) has to serve more than one client: the UMak TBL Hub (Moodle 5.0 LMS) and a Telegram bot, with more channels possible. The Next.js app in `app/` is the admin dashboard for document upload and is a separate concern. The knowledge base is four organizer files, `Source01.md` to `Source04.md`, about 71k characters (roughly 20k tokens) after splitting. PRD §4 sketches embeddings, a vector store and a similarity "match score" gate.

## Decision

- Build the chatbot as its own Python service in `chatbot/`: LangChain (`langchain-core`, LCEL) and FastAPI. Every channel calls `POST /chat`; Telegram runs the same chain in-process.
- LLM: Gemini through `langchain-google-genai`, model set by `GEMINI_MODEL` (default `gemini-3.5-flash`), temperature 0, structured output (`GroundedAnswer`).
- No embeddings and no vector store. The sources are split into sections by heading (`kb.py`), each tagged with source, breadcrumb section label and tenant. `ScopedSectionRetriever` returns every section in the student's scope (their college plus University-wide), and all of it fits in context.
- Grounding is enforced after the model, not by a similarity score: the reply must have status `answered` or `conflict`, a non-empty answer, and at least one citation, and every cited id must be a section that was actually provided. Otherwise the reply is exactly "Information not in provided sources".
- Each message runs four LangChain chains: guard, rewrite (translate and normalize, using thread history), answer (retrieval plus gate), and conversation (warm tone in the user's language, kept only if every number survives).
- TBL Hub integration is one `<script src=".../widget.js">` tag (Moodle: Site administration → Appearance → Additional HTML). `chatbot/demo/tbl-hub/` is a local copy of the TBL dashboard that shows the placements.

## Consequences

- Multi-hop questions (an office in Source01, its room in Source03) work without retrieval tuning, and there is no embedding cost or index to rebuild.
- The citation check covers more than a score threshold would: it also rejects invented or out-of-scope citations.
- Each question sends about 20k input tokens. That is fine at hackathon scale but costs more per call than top-k retrieval.
- When the knowledge base grows (admin uploads, FR4.4) beyond comfortable context size, replace `ScopedSectionRetriever` with a BM25 or vector retriever behind the same interface. The API and the gate stay the same.
- The PRD §4 diagram's "vector store" and "match score" are superseded by this ADR for v1.
