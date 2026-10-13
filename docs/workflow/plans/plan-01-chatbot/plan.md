# Plan 01: Grounded chatbot for TBL Hub and Telegram

**Status:** In progress
**Owner:** `chatbot/`
**Dependencies:** `GOOGLE_API_KEY` (Gemini); `TELEGRAM_BOT_TOKEN` and `TELEGRAM_BOT_USERNAME` for Telegram
**Requirements:** FR1.1, FR1.2, FR1.3, FR1.4, FR1.5, FR2.1, FR2.2, FR2.3 (widget college switch); query log toward FR4.1, FR4.2; NFR-02, NFR-03, NFR-07; ADR 0001

## Problem Statement

Students need verified answers about scholarships, admission requirements, offices and locations where they already are: the TBL Hub LMS and Telegram. A generic chatbot answers confidently from memory; this one must answer only from the four organizer sources, cite them, and refuse otherwise.

## Solution

A Python LangChain service (`chatbot/`) with one `POST /chat` API, an embeddable widget for TBL Hub, a Telegram bot, and a local TBL Hub copy that shows where the assistant goes.

## Design Spec (UI work)

Reference: the TBL Hub dashboard screenshot (Moodle 5.0), rebuilt in `chatbot/demo/tbl-hub/`.

- **① Floating assistant (primary).** An orange chat bubble above TBL's orange "?" button opens a 380×560 panel (full screen under 480 px). It has a navy header "HeronsGuide · Answers from official UMak documents", a college selector, suggested questions, citation chips, and a "Continue on Telegram" link when the bot username is set. Loaded on every TBL page via Moodle "Additional HTML": `<script src="https://<host>/widget.js" data-college="CCIS" defer></script>`.
- **② "Ask HeronsGuide" dashboard block (secondary).** Sits above Timeline in the Timeline card style, with an input, three demo chips and a Telegram link. Submitting opens the floating panel. In Moodle this is an HTML block.
- **③ Navbar icon:** pitch only.
- **Answer states:** answered (citations), conflict (amber, warning label, note, all citations), refusal (dashed neutral notice with the exact fallback), error (red notice).

## Implementation Decisions

- **Knowledge base.** `chatbot/kb/Source0*.md` are organizer data and are never edited. `kb.py` rebuilds breadcrumbs from the flat PDF-converted headings: bullets are body text, all-caps headings are groups, floors and wings nest under buildings. Section ids look like `Source01-s037`. Tenants: Source02 is CCIS except "OTHER COLLEGES AVAILABLE"; everything else is University-wide.
- **Retrieval.** `ScopedSectionRetriever` returns all sections in scope (ADR 0001).
- **Prompt.** Sources go in `<source id file section>` blocks and the question in `<question>`, both escaped. System rules forbid outside knowledge and treat both blocks as data.
- **Pipeline** (`chains.py`, `pipeline.py`), one `prompt | model` chain per step:
  1. `guard_chain` labels the message valid, greeting or invalid.
  2. `rewrite_chain` translates and normalizes it into a standalone English query, using the thread history. Steps 1 and 2 run in parallel.
  3. Greetings get a canned friendly reply and invalid messages a polite redirect. Valid ones go to retrieval, then `answer_chain` and the gate.
  4. `conversation_chain` rewrites the answer warmly in the user's language. Its text is used only if every number from the gated answer survives (`keeps_facts`).
  The exact fallback is never rephrased.
- **Gate.** `pipeline.apply_gate`: refuse unless status is answered or conflict, the answer is non-empty, and the citations are non-empty and all among the provided ids.
- **API.** `POST /chat {question (1–1000 chars), college?, channel, history?[{role: user|assistant, content}]}` returns `{status: answered|conflict|not_in_sources|greeting|invalid, answer, citations[{id, source, section}], conflict_note, query, language}`. The last 10 history turns are used. `GET /config` returns colleges and telegram_url; `GET /health`; `/widget.js`; `/demo/tbl-hub/`. A bot setup or model failure returns 503. CORS comes from `ALLOWED_ORIGINS`.
- **Query log.** SQLite `chatbot/data/queries.db` stores asked_at, channel, college, question, status and citations, with no names. `QueryLog.gaps()` feeds the admin gap list later.
- **Widget.** A chat inbox: a conversation list (new, open, delete) and threads saved in the browser. Each send includes the thread history. `data-title`, `data-tagline`, `data-greeting`, `data-primary`, `data-accent`, `data-suggestions` and `data-college` customize it.
- **Telegram.** `python -m heronsguide.telegram_bot` uses the same pipeline and demo-account context as the website. Startup registers the command Menu and pre-chat description. `/start` and `/help` show the welcome, command list and starter-question keyboard; `/new` clears the thread; `/suggestions` restores the latest suggested replies; `/college <code>`, `/colleges` and `/whoami` retain college and demo-account controls. College changes start a fresh thread. Pipeline callbacks update one progress message while generation runs, with typing refreshed; the completed progress stays above the answer. These are observable pipeline steps, never private model reasoning. Suggested replies send normal questions in the same thread, with starter fallbacks for greetings/refusals. Long replies are split within Telegram limits; progress-delivery failures do not drop the answer. **Owner presentation exception to FR1.2/FR1.4:** Telegram omits source filenames/section lists in progress and answers, while internal citation validation, conflict warnings and exact refusals remain enforced. Opening a chat shows the bot description; Telegram requires pressing Start or sending `/start` for a welcome message. History and college selection remain in memory and reset on process restart.
- **Telegram startup reliability (NFR-05).** Connections allow 15 seconds, responses 30 seconds; initialization and polling bootstrap allow three retries. The optional command Menu/profile setup makes up to three attempts with short delays and then permits chat startup on network failure. Invalid API arguments/tokens remain failures. Exhausted bootstrap network failures produce a concise connectivity error.
- **Student account (ADR 0002, proposed).** `data-student-token` → `X-Student-Token` → `AccountProvider` (demo: fictional `samples/sample_account.json`). `GET /account/me` feeds the "My account" tab. On `/chat` the records become `Account-*` sections the answer can cite. Only academic fields are sent; never address, guardian, birth date, email or student number.
- **Widget views.** Compact by default (400×620), with an expand button for a wide two-column view (conversations and "My account" on the left, chat on the right). The wide view is for showcasing and longer sessions. The banter loader shows while answers and records load. A "guide, not a second brain" notice sits above the input.
- **Class Meet links.** Each course may carry a `meet_link`, which must be a `https://meet.google.com/...` URL (production: the Meet resource on the TBL course page; the sample uses placeholders). The links form the `Account-meet` section. The answer prompt says to paste the exact URL, and `keeps_facts` now rejects a friendly rewrite that changes any URL as well as any number. The widget turns https links into clickable text and adds Join/Copy cards for Meet links in answers and under "My account" › Class links.
- **Show thinking.** `POST /chat/stream` returns one NDJSON `step` event per finished pipeline step: checked the message, understood the question (rewritten query), looked through N sections, drafted, verified citations, friendly reply. A final `result` event follows. These steps report what the pipeline did; they are not hidden model reasoning. The widget shows them live under the banter loader, then keeps them as a collapsible "Show thinking" above the answer. `/chat` also returns `steps`.
- **Suggested replies.** `conversation_chain` returns `FriendlyReply{reply, follow_ups}`. Follow-ups (at most 3) render as chips under the latest answer and send in the same thread. Refusals and greetings fall back to the starter questions.
- **Full screen.** A maximize button makes the panel cover the viewport, with two columns and a centered 860 px reading column. Esc exits full screen first.
- **Customizer artifact.** "HeronsGuide Studio" (claude.ai artifact) is a static mock portal with a live HeronsGuide that runs the same four steps through Claude, because artifacts cannot call this server. It generates the embed snippet.

## Testing Decisions

- Stub-model tests (`chatbot/tests/`) cover the splitter (unique ids, breadcrumbs, bullets, tenants), the gate (fallback, uncited, invented and out-of-scope citations, conflict), injection escaping, logging, and the API contract and errors.
- Real-model checks: `chatbot/evals/questions.yaml` (20 cases: the demo script, multi-hop, scope, out-of-scope, injection) via `evals/run_eval.py`, reporting SM-1 to SM-3.

## Out Of Scope

The admin dashboard (`app/`), banners and reminders (FR3), analytics UI (FR4.1, FR4.2 views), source upload (FR4.4), Filipino answers (FR1.6), and deployment.

**Dashboard-to-chatbot sync is narrated, not wired.** The admin dashboard (`plan-01-admin-api`) stores uploaded sources in its own SQLite database (`app/data/heronhub.sqlite`). The chatbot still reads only `chatbot/kb/*.md` and does not read that database. In the demo we say that a source updated in the dashboard also updates in TBL Hub. FR4.4 "re-index" stays unimplemented on the chatbot side until someone builds that link.
