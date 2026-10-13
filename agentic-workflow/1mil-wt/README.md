# 1mil-wt: Workflow Kit

A reusable build workflow for AI-assisted projects, first used on 1mil.dev. It covers:
- **Design first:** grill the idea, then build a clickable first-look board at real screen sizes.
- **Spec-driven plans:** requirements, a plan, tickets, evidence, and a gate.
- **Cheaper models for the bulk of the work:** GLM or DeepSeek build in OpenCode or Claude Code, and a stronger model reviews and merges.

It is plain files, not an app. Copy it into each new project, and bring improvements back here (especially "Improving The Playbook" in `docs/workflow/playbook.md`).

## Start A New Project

1. Copy everything here (including `.gitignore`, excluding `.git/`) into the new repository root. Merge `.gitignore` if one exists. Delete `skills/` in the copy; skills are installed globally (step 4).
2. Search and replace the placeholders:

   | Placeholder | Meaning | Example (1mil.dev) |
   | --- | --- | --- |
   | `{{PROJECT}}` | Project name | `1mil.dev` |
   | `{{CHECK_CMD}}` | One command running typecheck, lint, test, build | `pnpm check:workspace` |
   | `{{DEV_BRANCH}}` | Development branch | `test` |
   | `{{PROD_BRANCH}}` | Production branch | `master` |
   | `{{DEPLOY}}` | Hosting / deploy target | Vercel, root `apps/web` |

3. Fill `CONTEXT.md`, `docs/product/requirements-engineering.md`, and `docs/dev/technology-stack-and-development.md` (the grilling rounds produce most of this).
4. Install skills:
   - `npx skills experimental_install`: the skills listed in `skills-lock.json` (grilling, to-spec, to-tickets, implement, tdd, code-review, and more).
   - Kit skills in `skills/`: copy each folder to `~/.claude/skills/` (Claude Code) and `~/.config/opencode/skills/` (OpenCode).
   - Design QA: `npx impeccable install` ([Impeccable](https://github.com/pbakaus/impeccable), Apache-2.0; works in Claude Code and OpenCode).
5. Run `/grill-with-design` to get from idea to a locked look, then plan and tickets.

## The Loop

```text
grill-with-design ─▶ first-look board ─▶ "lock it" ─▶ design brief + ADR + board export
      ─▶ plan + tickets (+ handoff prompts) ─▶ flash models build in worktrees
      ─▶ review tier checks, Impeccable audit, merges ─▶ parity check vs board ─▶ promote
```

Details: `docs/workflow/playbook.md`.

## What's Inside

- `AGENTS.md` / `CLAUDE.md`: agent rules (Claude Code, Codex, and OpenCode read them).
- `docs/workflow/playbook.md`: the build loop and its "Rules Learned".
- `docs/workflow/`: roadmap, plan packet template (`plan`, `tasks`, `evidence`, `gate`), traceability map.
- `docs/agents/`: bootstrap, skill and model routing (flash-tier rules, Impeccable), local issue tracker, model setup (Claude Code and OpenCode with GLM or DeepSeek).
- `docs/standards/`: git workflow (including parallel worktrees), documentation policy, guardrails, issue log, convention and design-brief stubs.
- `templates/ticket.md`: ticket format for `.scratch/<feature>/issues/`.
- `templates/flash-prompt.md`: paste-ready prompts for flash-tier builders and the review tier.
- `skills/grill-with-design/`: grilling, then app flow, wireframes, references and a launch checklist, and a size-exact clickable first-look board with a trust layer (legal footer, cookie bar, consent) before any plan or code.

## Working With A Teammate

- Clone this repo, then follow "Start A New Project" for each new build.
- Improve the kit through a branch and pull request; note the lesson in "Improving The Playbook".
- Keys and local agent state never go in the repo (`.claude/`, `.agents/`, `.scratch/`, and `.env*` are ignored).
