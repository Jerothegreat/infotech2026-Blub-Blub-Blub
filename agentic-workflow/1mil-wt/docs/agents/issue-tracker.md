# Issue Tracker: Local Markdown

Detailed tickets and implementation notes live as Markdown files under `.scratch/` (git-ignored). Durable scope and status stay in the owning `docs/workflow` plan packet.

## Conventions

- Use one directory per feature: `.scratch/<feature-slug>/`.
- Put actionable tickets at `.scratch/<feature-slug>/issues/<NN>-<slug>.md`, starting at `01`. Format: `templates/ticket.md`.
- Keep a `Status:` line near the top of each issue file.
- Append discussion under a `## Comments` heading.
- Keep `tasks.md` in the owning workflow plan as a short ordered index linking these tickets; do not copy full ticket bodies into it.
- `to-spec` targets the owning canonical `plan.md`; it must not create a second durable specification under `.scratch`.
- `.scratch/` is local to one checkout. A new worktree does not get it; copy the tickets in when creating the worktree.

Keep recurring repository issue history in `docs/standards/issue-log.md`, and record verified execution in the owning plan's `evidence.md`.
