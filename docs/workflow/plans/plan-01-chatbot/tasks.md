# Plan 01 Tasks

Built inline in one session; no `.scratch` tickets.

- [x] `01-01` Scaffold `chatbot/` (uv, ruff, pytest); move sources to `chatbot/kb/`.
- [x] `01-02` Section splitter and tenant tags (`kb.py`). Requirements: FR2.1.
- [x] `01-03` Scoped retriever, prompt, Gemini structured output, grounding gate (`retriever.py`, `prompts.py`, `chains.py`, `pipeline.py`). Requirements: FR1.1–FR1.5, FR2.2.
- [x] `01-04` FastAPI `/chat`, `/config`, query log, CORS, static widget and demo (`api.py`, `log.py`). Requirements: NFR-03.
- [x] `01-05` TBL Hub copy (`demo/tbl-hub/`) with placements toggle.
- [x] `01-06` Embeddable widget (`widget/widget.js`) and "Ask HeronsGuide" block. Requirements: FR1.2, FR2.3, NFR-07.
- [x] `01-07` Telegram adapter (`telegram_bot.py`).
- [x] `01-10` Four-step pipeline: guard, rewrite, answer, conversation, with thread history. Requirements: FR1.5, FR1.6.
- [x] `01-11` Chat-inbox widget and HeronsGuide rename; customizer artifact.
- [x] `01-12` Signed-in student context: sample account, `/account/me`, `Account-*` sections, "My account" tab, banter loader, wide view, "guide, not a second brain" notice. ADR 0002 (proposed).
- [x] `01-13` Live "Show thinking" (`POST /chat/stream`, NDJSON pipeline steps), suggested replies from the conversation step, full-screen mode.
- [x] `01-14` Class Google Meet links: `Course.meet_link` (meet.google.com only), `Account-meet` section, links kept exactly by the fact check, Join/Copy cards in chat and "My account".
- [x] `01-15` TBL demo matches the Studio artifact's chat: sizes, spacing and contrast-safe text colors ported into `widget.js`; `data-open="inbox"` opens the inbox on load (not on phones).
- [x] `01-16` Telegram demo sign-in: user ids in `TELEGRAM_DEMO_USER_IDS` get the sample student's records (same answers as the signed-in TBL demo); `/whoami` shows the id.
- [x] `01-17` Telegram parity feedback: live pipeline progress without source lists, suggested replies, welcome/help, registered command menu, fresh context on college changes and long-answer delivery. Requirements: FR1.1, FR1.3-FR1.5, FR2.2, FR2.3; owner presentation exception to FR1.2/FR1.4. Automated verification complete; live owner test owed.
- [x] `01-18` Telegram startup timeout fix: extended request timeouts, bounded initialization retries, retryable menu/profile setup and clear exhausted-retry error. Requirement: NFR-05. Full suite and live authentication/menu/description checks pass; polling/chat owner test remains owed.
- [ ] `01-08` Run `evals/run_eval.py` against Gemini and record SM-1 to SM-3. Blocked by: `GOOGLE_API_KEY`.
- [ ] `01-09` Owner manual test: TBL copy and Telegram (see `evidence.md` manual script).
