# HeronsGuide (appUmakHackathon)

A centralized, college-aware campus hub for UMak whose AI answers only from the official documents and says so when it cannot. Built for the UMak hackathon using the [1mil-wt](https://github.com/Jerothegreat/1mil-wt) workflow kit.

## Layout

```text
app/                    Next.js admin dashboard: document upload (pnpm)
chatbot/                grounded chatbot: Python LangChain + Gemini + FastAPI, TBL widget, Telegram bot,
                        TBL Hub demo copy, knowledge base in chatbot/kb/
docs/product/           01 problem statement, 02 PRD, 03 KPIs, 04 pitch outline, 05 judge Q&A,
                        requirements-engineering.md (requirement ID index)
docs/workflow/          roadmap, plan packets, traceability, playbook (the build loop)
docs/agents/            bootstrap, skill and model routing, issue tracker, model setup
docs/standards/         git workflow, conventions, design brief, guardrails, issue log
docs/dev/               stack and commands
docs/adr/               architecture decisions
AGENTS.md / CLAUDE.md   agent rules; CONTEXT.md is the one-page domain summary
skills/, templates/     kit skill and ticket / flash-prompt templates
```

## Getting Started

1. Install skills: `npx skills experimental_install` (from `skills-lock.json`); copy `skills/grill-with-design/` to `~/.claude/skills/`; optional design QA: `npx impeccable install`.
2. Chatbot: `cd chatbot`, copy `.env.example` to `.env` and add `GOOGLE_API_KEY`, then `uv sync` and `uv run uvicorn heronsguide.api:app --port 8787`. Open `http://localhost:8787/` for the TBL Hub demo. Telegram: `uv run python -m heronsguide.telegram_bot`.
   Admin dashboard: `pnpm --dir app install`, then `pnpm --dir app check`.
3. Run `/grill-with-design` to lock the look, then plan and tickets (`docs/workflow/README.md`).

Telegram requires `TELEGRAM_BOT_TOKEN` in `chatbot/.env`; `TELEGRAM_BOT_USERNAME` enables the website link. Start or restart it from the repository root with `python -m uv --directory chatbot run python -m heronsguide.telegram_bot` (use `uv` directly if available). Startup configures the bot description and command Menu. Press Start or send `/start` for the welcome and suggested questions; `/help`, `/new`, `/suggestions`, `/college <code>`, `/colleges` and `/whoami` are available. Telegram shows live pipeline progress and suggested replies while keeping citation checks internal. See the [Telegram manual test](docs/workflow/plans/plan-01-chatbot/evidence.md#telegram-parity-feedback-01-17).

## The Loop

```text
grill-with-design ─▶ first-look board ─▶ "lock it" ─▶ design brief + ADR + board export
      ─▶ plan + tickets (+ handoff prompts) ─▶ flash models build in worktrees
      ─▶ review tier checks, Impeccable audit, merges ─▶ parity check vs board ─▶ promote
```

Details: `docs/workflow/playbook.md`.

Keys and local agent state never go in the repo (`.claude/`, `.agents/`, `.scratch/`, and `.env*` are ignored).
