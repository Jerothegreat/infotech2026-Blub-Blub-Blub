# Plan 01 Evidence

Observed results only. A skipped check says so.

| Task | Evidence | Status |
| --- | --- | --- |
| 01-02 | Real sources split into 152 sections, about 71k characters (Source01 86, Source02 3, Source03 45, Source04 18); breadcrumbs checked, e.g. "ADMIN BUILDING › Mezannine › B. South Wing" | Pass |
| 01-01..07 | `uv run pytest`: 21 passed. `uv run ruff check .`: all checks passed | Pass |
| 01-04 | Without `GOOGLE_API_KEY`: `/health` 200, `/demo/tbl-hub/` 200, `/chat` 503 (after fix; was 500) | Pass |
| 01-05/06 | Headless Edge screenshots at 2000 px, 1600 px and 390 px (in an iframe): navbar, Timeline and guides match the reference; bubble above "?"; panel full screen at 390 px with no horizontal scroll; answered, conflict and refusal states rendered with a stub model | Pass |
| — | `pnpm --dir app check` not run: pnpm is not installed on this machine | Skipped |
| 01-08 | First real-Gemini run (2026-10-13): 19/20; SM-3 100%. The prompt-injection case came back `invalid` from the guard (a correct refusal), which the eval does not yet count as a refusal, so SM-1 and SM-2 read low. Eval fix owed | Partial |
| 01-15 | Headless Edge at 1600 px: TBL page loads with the inbox open, matching the artifact's chat; 390 px iframe: full-screen panel. `node --check widget.js`, ruff and `pytest` (44) pass | Pass |
| 01-07 | Telegram not run: no bot token yet | Owed |
| 01-17 | 2026-10-13: Telegram test-first run: 10 failed, 2 passed before implementation. Final `python -m uv --directory chatbot run ruff check .`: all checks passed; `python -m uv --directory chatbot run pytest`: 59 passed, including 15 Telegram tests. Covers progress before generation completes, no source lists, conflicts/exact refusal, follow-up history, linked-record access, command registration, college changes, Unicode answer splitting and progress/model failures. `pnpm --dir app check` unavailable: pnpm not on PATH. Live Telegram not started/restarted or tested in this pass. | Automated pass; live test owed |
| 01-18 | 2026-10-13: test-first startup regressions: 3 failed, 16 passed before fix. Final `python -m uv --directory chatbot run ruff check .`: all checks passed; `python -m uv --directory chatbot run pytest`: 63 passed (19 Telegram). Public HTTPS: 302; configured bot authenticated with extended timeouts (6.9 seconds elapsed). Applied and read back all seven live commands, Menu type `commands` and the pre-chat description successfully. No polling or user messages sent. `pnpm --dir app check` unavailable (pnpm not on PATH). | Automated and live setup pass; owner polling/chat test owed |
| 01-18 runtime follow-up | Owner reached `Application started`, then Telegram reported concurrent `getUpdates` conflict. Inspected local launch chains; on owner request, stopped the one identified local Telegram chain and verified zero matching bot processes remain. No polling was started by the agent; remote competing instance remains unidentified. | Local bot stopped; end-to-end chat still owed |

## Manual test script (owner)

1. `cd chatbot`, copy `.env.example` to `.env`, set `GOOGLE_API_KEY` (and the Telegram values).
2. `uv run uvicorn heronsguide.api:app --port 8787`, then open `http://localhost:8787/`.
3. Ask the demo questions from `docs/product/04-pitch-deck-outline.md`. Expected:
   - BS CS GWA cites Source02.
   - The Varsity endorser cites Source01, and the Registrar cites Source03.
   - "esports scholarship" gets the exact fallback.
   - The Partial Entrance Token Fee GWA question is flagged as a conflict with two citations.
4. Switch the college to CBA and ask the BS CS question again: expect a refusal (CCIS-only source).
5. `uv run python evals/run_eval.py` and record SM-1 to SM-3 here.
6. `uv run python -m heronsguide.telegram_bot`, then in Telegram: `/college CCIS` and a demo question gets a grounded answer with live progress, no source list and suggested replies. Send `/whoami`, put the id in `TELEGRAM_DEMO_USER_IDS`, restart the bot, and "What's due this week?" answers from the sample student's records.

### Telegram parity feedback (01-17)

1. Restart the bot with `python -m uv --directory chatbot run python -m heronsguide.telegram_bot` after configuring `GOOGLE_API_KEY` and `TELEGRAM_BOT_TOKEN` in `chatbot/.env`. Keep only one polling process for the token.
2. Open the bot chat: check the pre-chat description; press Start or send `/start` for the welcome and question keyboard. Check Menu lists `/start`, `/help`, `/new`, `/suggestions`, `/college`, `/colleges` and `/whoami`.
3. Set `/college CCIS`, ask the BS CS GWA question, and watch the progress message update before the answer. The completed progress remains above the answer; neither displays a source list.
4. Tap a generated suggested reply. Check it uses the same conversation, then use `/suggestions` to restore its reply keyboard.
5. Ask the Partial Entrance Token Fee GWA question: the conflict warning and note remain visible. Ask about esports scholarships: the answer is exactly `Information not in provided sources` and starter buttons return.
6. Use `/new` and switch to `/college CBA`: each starts a fresh conversation. Check `/help`, `/colleges`, `/whoami` and an unknown command. For an allow-listed demo user, ask about this week's deadlines and a class Meet link.
