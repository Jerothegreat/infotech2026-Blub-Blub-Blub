# Fresh Checkout Bootstrap

Use this sequence when a developer or coding agent first opens the repository. The repository is the setup contract; local tool installations and credentials stay outside Git.

## Read First

1. Read the root `AGENTS.md` (Claude Code loads it through `CLAUDE.md`).
2. Read `docs/agents/skill-policy.md`, `docs/agents/domain.md`, and `docs/agents/issue-tracker.md`.
3. Read `docs/workflow/README.md`, then the active roadmap/plan files before changing code.
4. Check the package manifest, lockfile, `skills-lock.json`, and every relevant `.env.example`.

Completion criterion: the agent can identify the package manager, environment inputs, source-of-truth documents, and required verification commands without relying on a personal machine path.

## Install And Configure

1. Verify the runtime and package manager versions match the manifest.
2. Run one sequential install at the repository root. Do not use watch mode during bootstrap.
3. Copy each required `.env.example` to a local env file and fill only local values. Keep env files untracked.
4. Install the skills named by `skills-lock.json` with `npx skills experimental_install`. The repository records the manifest, not vendored copies of installed skills.

Completion criterion: dependencies resolve, local environment files exist where needed, and no credential or machine-specific installation directory is staged.

## Verify The Workspace

Run `{{CHECK_CMD}}` (typecheck, lint, test, build in order). Start a dev server only after explicit approval for that session.

Completion criterion: each command has an observed pass, skip, or failure recorded; skipped checks are blockers or limitations, not passing evidence.

## Local Agent State

- `.agents/` and `.claude/` contain local skill installations and may differ by developer.
- `.scratch/` contains local feature notes and issue records.
- `CONTEXT.md`, `AGENTS.md`, `CLAUDE.md`, `docs/agents/**`, and `skills-lock.json` are repository-shared guidance.
