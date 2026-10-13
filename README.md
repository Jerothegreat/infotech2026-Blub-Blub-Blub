# HeronHub (appUmakHackathon)

A centralized, college-aware campus hub for UMak whose AI answers only from the official documents and says so when it cannot. Built for the UMak hackathon using the [1mil-wt](https://github.com/Jerothegreat/1mil-wt) workflow kit.

## Layout

```text
app/                    Next.js web app (pnpm)
docs/product/           01 problem statement, 02 PRD, 03 KPIs, 04 pitch outline, 05 judge Q&A,
                        requirements-engineering.md (requirement ID index)
docs/workflow/          roadmap, plan packets, traceability, playbook (the build loop)
docs/agents/            bootstrap, skill and model routing, issue tracker, model setup
docs/standards/         git workflow, conventions, design brief, guardrails, issue log
docs/dev/               stack and commands
docs/adr/               architecture decisions
Source01-04.md          organizer knowledge base (location to be decided)
AGENTS.md / CLAUDE.md   agent rules; CONTEXT.md is the one-page domain summary
skills/, templates/     kit skill and ticket / flash-prompt templates
```

## Getting Started

1. Install skills: `npx skills experimental_install` (from `skills-lock.json`); copy `skills/grill-with-design/` to `~/.claude/skills/`; optional design QA: `npx impeccable install`.
2. Install the app: `pnpm --dir app install`, then verify with `pnpm --dir app check`.
3. Run `/grill-with-design` to lock the look, then plan and tickets (`docs/workflow/README.md`).

## The Loop

```text
grill-with-design ─▶ first-look board ─▶ "lock it" ─▶ design brief + ADR + board export
      ─▶ plan + tickets (+ handoff prompts) ─▶ flash models build in worktrees
      ─▶ review tier checks, Impeccable audit, merges ─▶ parity check vs board ─▶ promote
```

Details: `docs/workflow/playbook.md`.

Keys and local agent state never go in the repo (`.claude/`, `.agents/`, `.scratch/`, and `.env*` are ignored).
