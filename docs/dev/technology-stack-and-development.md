# Technology Stack And Development

## Stack

| Layer | Choice | Why |
| --- | --- | --- |
| Admin dashboard | Next.js 16.4 (App Router), React 19.3, in `app/` | Document upload; out of scope for plan 01. Read `app/AGENTS.md`: this Next.js version differs from training data. |
| Language | TypeScript 5 | Scaffold default |
| Styling | Tailwind CSS 4 | Scaffold default; tokens come from `docs/standards/design-brief.md` |
| Lint | ESLint 9 with `eslint-config-next` | Scaffold default |
| Package manager | pnpm 11 (`app/pnpm-lock.yaml`) | `packageManager` field |
| Chatbot service | Python 3.12+, `uv`, LangChain (`langchain-core`, `langchain-text-splitters`), FastAPI + Uvicorn, in `chatbot/` | One API for every channel; ADR 0001 |
| LLM | Gemini via `langchain-google-genai`, `GEMINI_MODEL` (default `gemini-3.5-flash`), structured output | ADR 0001 |
| Embeddings and vector store | None: scoped full-context sections plus a citation gate | ADR 0001 |
| Channels | TBL Hub widget (`chatbot/widget/widget.js`, vanilla JS, Shadow DOM); Telegram (`python-telegram-bot`) | Plan 01 |
| Query log | SQLite `chatbot/data/queries.db` (git-ignored) | NFR-03; feeds FR4.1, FR4.2 |
| Auth and roles | TBD | FR2.4 needs per-tenant admin rights |
| Tests | `pytest` + `ruff` in `chatbot/`; `evals/run_eval.py` for real-model grounding metrics. None yet in `app/`. | |

## Commands

Run from the repository root.

| Command | Does |
| --- | --- |
| `pnpm --dir app install` | install dependencies |
| `pnpm --dir app check` | typecheck, lint, build (no test script yet) |
| `pnpm --dir app dev` | apply SQLite migrations, then start the admin dashboard dev server |
| `uv --directory chatbot sync` | install chatbot dependencies (if `uv` is not on PATH: `python -m uv`) |
| `uv --directory chatbot run uvicorn heronsguide.api:app --port 8787` | chatbot API + TBL demo at `http://localhost:8787/` (port 8000 is taken by a Windows service on the owner's machine) |
| `uv --directory chatbot run python -m heronsguide.telegram_bot` | Telegram bot (polling) |
| `uv --directory chatbot run ruff check .` / `uv --directory chatbot run pytest` | chatbot lint / tests |
| `uv --directory chatbot run python evals/run_eval.py` | grounding eval against Gemini (SM-1 to SM-3) |

## Deploy

Admin dashboard: Vercel (planned, not set up), root directory `app`, tracks `main`.

Chatbot: host TBD (any Python host that runs Uvicorn). Env vars: `GOOGLE_API_KEY`, `GEMINI_MODEL`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`, `ALLOWED_ORIGINS` (must include the TBL Hub origin). TBL Hub embeds `<script src="https://<host>/widget.js" data-college="CCIS" defer></script>` via Site administration → Appearance → Additional HTML.
