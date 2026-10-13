# {{PROJECT}} Agent Guide

## Scope

This file governs AI-assisted work in this repository. `CLAUDE.md` imports this file, so Claude Code and Codex follow the same rules.

## Workspace Map

- `<app dirs>`: <what each holds>.
- `docs/workflow/` is the canonical execution hierarchy. Read the roadmap and the active plan's `plan.md`, `tasks.md`, `evidence.md`, and `gate.md` before implementation.
- `docs/product/requirements-engineering.md` is the canonical atomic requirement source.

Generated and local state (build output, `node_modules/`, `.env` files, local caches) is excluded from source audits and preserved unless a task explicitly addresses it.

## Fresh Checkout

- Read `docs/agents/bootstrap.md` before installing dependencies or starting a service.
- Read `docs/agents/skill-policy.md`, `docs/agents/domain.md`, and `docs/agents/issue-tracker.md` before meaningful agent work.
- Use the committed manifests (package manifest, lockfile, `skills-lock.json`, `.env.example` files) as the setup contract.
- Treat `.agents/`, `.claude/`, `.scratch/`, and local `.npmrc` files as developer-local state. Do not copy machine-specific paths or installed skill payloads into the repository.
- Finish the bootstrap by running `{{CHECK_CMD}}` and recording any unavailable database, API key, or platform dependency as a blocker.

## Source Of Truth

Use this order when docs disagree:

1. Current code and tests in this checkout
2. `docs/product/requirements-engineering.md`
3. `docs/adr/*`
4. `docs/standards/implementation-conventions.md` and `docs/standards/design-brief.md`
5. `docs/dev/technology-stack-and-development.md`
6. `docs/workflow/*`

Archived documents under `docs/workflow/archive/` are history, not input.

## Working Style

- Prefer smallest correct diff.
- Keep files and packages minimal. No speculative abstractions.
- Use terse, factual progress updates.
- Do not rewrite adjacent code unless task needs it.
- Keep the Superpowers family, `ponytail`, and `caveman` inactive unless the user explicitly re-enables them.
- Use specs, detailed plans, or subagents only for multi-feature, ambiguous, architectural, or safely parallelizable work.

## Execution Mode

- Default to inline execution. A plan template's subagent recommendation is not a decision for this workspace.
- Inspect `git status --short` before choosing an execution mode.
- When the checkout is dirty, implementation stays inline by default; do not dispatch an implementation subagent into the shared checkout.
- Use a subagent only for read-only research/review, or when the user explicitly requests it and the work is isolated, independently verifiable, and does not share mutable files or runtime state with the active task.
- Keep sequential, dependency-installing, configuration, and runtime work inline.
- A subagent must not stage, commit, push, reset, clean, or modify unrelated files. If isolation cannot be demonstrated, use inline execution.
- Parallel sessions on separate tickets each use their own git worktree (see "Parallel Worktrees" in `docs/standards/git-workflow.md`).

## Agent Skills

Use the task trigger matrix, model routing, and completion gates in `docs/agents/skill-policy.md`. Cheaper flash-tier models follow its "Flash-Tier Rules"; connection setup is in `docs/agents/model-setup.md`.

### Issue tracker

Issues and implementation notes use local Markdown under `.scratch/<feature>/issues/`. See `docs/agents/issue-tracker.md`.

### Domain docs

See `docs/agents/domain.md` for the domain-document reading order.

### Workflow docs

Start at `docs/workflow/README.md`. Follow `roadmap.md` to the active plan, then read that plan's `plan.md`, `tasks.md`, `evidence.md`, and `gate.md` before changing code or documentation. The build loop (design first, feedback passes, verify, promote) is `docs/workflow/playbook.md`.

## Skill Override

- Workspace instruction takes precedence over generic skill workflows.
- Do not let generic brainstorming/spec/plan skills force extra process for routine, simple, single-slice work.
- For simple, clear, single-slice changes: inspect the relevant code/docs, then implement directly with the smallest correct diff.
- Only switch to specs, detailed plans, or subagents when the work is multi-feature, ambiguous, architectural, safely parallelizable, or when the user explicitly asks for a spec, design, or plan.
- If a loaded skill conflicts with this rule for routine work, follow this workspace rule and continue with direct execution.

## Code Conventions

Durable detail lives in `docs/standards/implementation-conventions.md`. The short form:

- Content is data: content lives in data files, never hard-coded in components.
- Design values come only from the tokens in `docs/standards/design-brief.md`. No ad-hoc colors, radii, or shadows.
- Secrets are server-only. Never expose them to the client.
- Respect `prefers-reduced-motion` and keyboard access in every interactive component.
- Prefer existing dependencies and platform features over new packages.

## Workflow

- `{{DEV_BRANCH}}` is the active development branch; promote verified work to `{{PROD_BRANCH}}`. See `docs/standards/git-workflow.md`.
- Do not create worktrees or subagents for routine/simple tasks.
- Do not push unless the user explicitly asks.
- Use Conventional Commits.
- Update docs as part of the same task when behavior, workflow, or architecture changes.

## Guardrails

- Never use destructive git commands like `reset --hard` or `checkout --` unless the user explicitly asks.
- Never expose or commit secrets.
- Do not modify unrelated untracked user files.
- Never publish private data. See `docs/standards/security-and-agent-guardrails.md`.
- Before major changes, inspect current docs and the issue log.

## Required Documentation Updates

For any non-trivial task, update one or more of these when relevant:

- `docs/workflow/plans/*`
- `docs/workflow/traceability/requirements-map.md`
- `docs/product/requirements-engineering.md`
- `docs/adr/*`
- `docs/standards/issue-log.md`

If a bug or setup issue appears, log it once so future sessions do not repeat it.
