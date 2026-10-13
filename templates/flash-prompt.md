# Flash-Tier Prompt Templates

Copy into a plan's `handoff.md`, one prompt per ticket. Fill the `<...>` parts. Rules: `docs/agents/skill-policy.md` ("Flash-Tier Rules", "Handoffs To The Flash Tier").

## Worktree per ticket

```bash
git worktree add ../<project>-wt/<ticket-branch> -b <ticket-branch> <dev-branch>
mkdir -p ../<project>-wt/<ticket-branch>/.scratch/<feature>
cp -r .scratch/<feature>/issues ../<project>-wt/<ticket-branch>/.scratch/<feature>/
cd ../<project>-wt/<ticket-branch> && pnpm install && opencode   # or: claude
```

## Flash-tier prompt (OpenCode with GLM / DeepSeek, or Claude Code with Sonnet)

```text
Read AGENTS.md, then follow "Flash-Tier Rules" in docs/agents/skill-policy.md.
Your ticket: .scratch/<feature>/issues/<NN>-<slug>.md. Also read only: <files and sections>.
Port markup and classes from docs/design/board-<direction>.html where the ticket names a section; do not redesign.
Before writing code, reply with: (1) the files you will create or change, (2) the tests you will write first, in order, (3) where each piece of copy or data comes from. Then wait for "go".
Guardrails: <ticket guardrails>. New dependencies allowed: <list or none>. Never invent facts; owed items stay labeled. No " · " separators in copy.
Finish with `<check command>` and paste the result lines and the red/green test log. Do not commit. Do not edit docs/ except appending your evidence row to <plan>/evidence.md.
```

## Review-tier prompt (Claude Code, Opus)

```text
Review ticket <NN> in ../<project>-wt/<ticket-branch>: read the ticket and `git diff <dev-branch>`. Check it against the ticket checklist, docs/standards/design-brief.md, and docs/design/board-<direction>.html at 1280 and 390, light and dark. Run `/impeccable audit` on the changed surface if installed. Rerun `<check command>`. Fix small issues or list what must go back to the flash session. Then append the evidence row, commit with a Conventional Commit naming the ticket and plan, merge into <dev-branch>, remove the worktree, and report how many fixes were needed.
```
