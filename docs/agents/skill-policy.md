# Skill And Model Policy

This policy routes work through the smallest reliable process while keeping one durable documentation hierarchy. The flow is spec-driven: requirements (`docs/product/requirements-engineering.md`) → plan packet (`docs/workflow/plans/`) → tickets (`.scratch/`) → implementation → evidence → gate.

## Defaults

- Information-only requests and clear one-line edits need no workflow skill.
- Routine, single-slice work stays inline: inspect, change, run focused verification, and report.
- Substantial features use the canonical workflow packet under `docs/workflow/plans/`.
- A skill is selected for a concrete trigger, not loaded as ceremony.

## Model Routing

| Work | Claude Code | Codex | Flash tier (optional) | Reasoning |
| --- | --- | --- | --- | --- |
| One ready ticket from `.scratch/` with explicit acceptance criteria | `claude-sonnet-5-5` | `gpt-5.6-terra` | `deepseek-v4-flash` or GLM Flash | `medium` |
| Content edits and small mechanical changes | `claude-haiku-4-5` | `gpt-5.6-terra` | `deepseek-v4-flash` or GLM Flash | `low` |
| Grilling, `to-spec`, `to-tickets`, new plans, ADRs | `claude-opus-5-5` | `gpt-5.6-sol` | not allowed | `high` |
| Wayfinder, security, or cross-cutting architecture | `claude-opus-5-5` | `gpt-5.6-sol` | not allowed | `high` |
| Independent code review and gate audit | `claude-opus-5-5` | `gpt-5.6-sol` | not allowed | `high` |
| Exceptional work that remains unresolved | `claude-fable-5-1` | `gpt-6-astra` | not allowed | `high` |

The medium-reasoning default is normal. Stronger models are explicit task-level overrides, not permanent defaults. Independent review should use a different session (and ideally a different model family) from the one that implemented the work. Connection setup for flash-tier models lives in `docs/agents/model-setup.md`.

### Flash-Tier Rules

Flash-tier models implement; they do not plan, decide, or approve.

- One ticket per session. Read `AGENTS.md`, the ticket, and only the files the ticket or `plan.md` names.
- If the ticket is ambiguous, a fact is missing, or the change would touch a file outside the ticket's scope, stop and report instead of guessing. Never invent content facts.
- Follow `tdd` at the agreed seams; keep the smallest correct diff and no new dependencies.
- Finish with `pnpm --dir app check && uv --directory chatbot run ruff check . && uv --directory chatbot run pytest` and paste its result lines into the report.
- Do not commit, push, edit `docs/` (other than appending the ticket's evidence row), or change `AGENTS.md`, `CONTEXT.md`, ADRs, or the design brief.
- A stronger model (review tier) checks the diff against the ticket before it is committed.

### Handoffs To The Flash Tier

Every handoff that queues work for a flash-tier model includes a paste-ready prompt per ticket, so the owner never has to compose one. Each prompt:

- opens with "Read AGENTS.md, then follow "Flash-Tier Rules" in docs/agents/skill-policy.md." and names exactly one ticket path plus only the context sections it needs;
- asks the model to reply first with the files it will touch, the tests it will write (in order), and the source of any content fact, then wait for "go";
- lists the ticket-specific guardrails (facts it must not invent, files it must not touch, test-first with a red/green log where a seam exists);
- ends with "Finish with `pnpm --dir app check && uv --directory chatbot run ruff check . && uv --directory chatbot run pytest` and paste the result lines. Do not commit. Do not edit docs/."

The handoff also includes the review-tier prompt the owner pastes into Claude Code after each ticket (review the diff against the ticket, rerun checks, record evidence, commit, report how many fixes were needed).

## Trigger Matrix

| Situation | Required skill or action |
| --- | --- |
| The appropriate workflow is unclear | Use `ask-matt` to route it. |
| A substantial repo-based feature still has product or design questions | Use `grill-with-docs`; use `grill-me` only outside a working repository. |
| The effort is too large or foggy for one planning session | Use `wayfinder` with the high-reasoning model to resolve decisions, then collapse them into the canonical plan before building. |
| Agreed discussion must become an execution contract | Use `to-spec`, targeting the active plan's `plan.md`. |
| A plan needs independently executable slices | Use `to-tickets`; detailed tickets live under `.scratch/<feature>/issues/` and `tasks.md` is their ordered index. |
| A ticket is ready to build | Use `implement` inline; it drives `tdd` where an executable seam exists and ends with review. |
| A behavior change or bug fix has an executable test seam | Use `tdd` before implementation. |
| A bug is non-trivial, intermittent, unclear, or hard to reproduce | Use `diagnosing-bugs` before `tdd`. |
| A runnable state, logic, or UI question blocks a decision | Use `prototype` before production implementation. |
| A new app, page, redesign, or new visual direction | Use `grill-with-design` before any plan or code: grilling, app flow, ASCII wireframes, then a rendered first-look board (2–3 directions, light and dark) for the owner to pick from (`docs/workflow/playbook.md` step 2). |
| The owner sends notes on a running build | Run one feedback pass: restate, task line, build, verify, evidence row, report in the owner's order (playbook step 6). |
| Web UI/UX design or visual polish | Use `frontend-design` (or `design-taste-frontend`) constrained by `docs/standards/design-brief.md`. The brief's tokens and rules win over any skill default. |
| Primary-source research is required | Use `research`; delegation is read-only and only when the user explicitly requests a subagent. |
| A human-only dashboard, credential, DNS, or provisioning step blocks work | Use `wizard`. |
| A focused module/interface/seam design is needed | Use `codebase-design`. |
| Terms, ownership, requirements, or durable architecture decisions change | Use `domain-modeling`; record hard-to-reverse decisions in `docs/adr/`. |
| A non-trivial code diff is ready for completion | Use `code-review` against the originating plan or ticket. |
| Agent-facing instructions or workflow documents change | Use `writing-for-agents`. |
| Work crosses a real session, model, or checkout boundary | Use `handoff`, referencing existing artifacts instead of restating them. |
| A repository-wide architecture survey is explicitly requested | Use `improve-codebase-architecture`; it remains opt-in. |

## Impeccable (Design QA)

[Impeccable](https://github.com/pbakaus/impeccable) (Apache-2.0) is the design QA layer for built UI. It works in Claude Code and OpenCode. Install it per project with `npx impeccable install` (refresh with `npx impeccable update`); commands run as `/impeccable <command>`.

| When | Command | Notes |
| --- | --- | --- |
| Right after the design is locked | `/impeccable init`, then `/impeccable document` | Point the generated `PRODUCT.md` and `DESIGN.md` at `docs/standards/design-brief.md`; the brief stays the source of truth. |
| A section or page is built | `/impeccable critique` and `/impeccable audit` | Critique covers hierarchy and clarity; audit covers accessibility, performance, and responsiveness. Record findings in `evidence.md`. |
| Forms, empty states, long text | `/impeccable harden`, `/impeccable clarify` | Edge cases, overflow, and copy. |
| Before the gate | `/impeccable polish` | Final pass for design-system alignment. |
| The owner says a part feels flat, loud, or busy | `bolder`, `quieter`, `distill` | Proposals only: show them on the board first, because the board is locked. |

**Precedence:** the locked board and the design brief win. An Impeccable suggestion that changes layout, tokens, or copy is a proposal for the owner, not an edit. Flash-tier models run only `audit` and `critique` (read-only) and report findings; they do not apply design changes.

## Durable Artifact Contract

- `docs/workflow/README.md` is the only implementation entrypoint.
- `docs/workflow/roadmap.md` identifies the owning plan.
- Every active plan has `plan.md`, `tasks.md`, `evidence.md`, and `gate.md`.
- `plan.md` owns scope, decisions, interfaces, dependencies, and completion criteria.
- `tasks.md` is a short execution index; detailed temporary tickets live in `.scratch`.
- `evidence.md` records observed commands and results. Expected results are not evidence.
- `gate.md` owns readiness, blockers, independent review, and completion status.
- `docs/workflow/plans/` is the only plan directory. Git history preserves retired paths.
- A conversational plan is not saved until its canonical files exist and have been read back.

## Completion Gates

- Pure documentation or configuration changes do not require `tdd`, but their links and configuration must be verified.
- If no executable seam exists, record that fact rather than inventing a test.
- Non-trivial code changes end with `pnpm --dir app check && uv --directory chatbot run ruff check . && uv --directory chatbot run pytest` and `code-review`.
- Do not duplicate a plan, specification, ticket, decision, or status across durable files.

## Inactive Skills

The Superpowers family, `ponytail`, and `caveman` may remain installed as local history but are inactive. Do not invoke or route work through them unless the user explicitly re-enables them.
