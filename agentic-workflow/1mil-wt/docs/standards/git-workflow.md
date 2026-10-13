# Git Workflow

## Default

- `{{DEV_BRANCH}}` is the solo development and verification branch.
- `{{PROD_BRANCH}}` is the promotion target and the branch the production deploy tracks.
- Feature branches are optional isolation, not a requirement.
- Do not use a heavy GitFlow process.

## Parallel Worktrees

Use only when several sessions (for example flash-tier models) build independent tickets at the same time.

1. One worktree and branch per ticket, outside the repository, in a sibling folder: `../<project>-wt/<branch>` (for example `../myapp-wt/p02-07` for plan 02 ticket 07).
2. Create it from the current development branch: `git worktree add ../<project>-wt/<branch> -b <branch> {{DEV_BRANCH}}`.
3. Copy the ticket into the worktree's `.scratch/` (it is git-ignored and not shared) and run the install there.
4. The review tier reviews each branch against its ticket and merges it into `{{DEV_BRANCH}}`.
5. Remove the worktree after merge: `git worktree remove ../<project>-wt/<branch>` and `git branch -d <branch>`.
6. To reuse an idle worktree for a new ticket: `git switch -C <new-branch> {{DEV_BRANCH}}` inside it (only when it has no uncommitted work).

## Promotion

For a verified plan or phase:

1. Inspect branch, status, diff, remotes, and recent log.
2. Run `{{CHECK_CMD}}` and any plan-specific checks and record results in the plan's `evidence.md`.
3. Request independent code review (see the model routing in `docs/agents/skill-policy.md`). Critical and High findings block promotion; fix and repeat. If the owner explicitly promotes first, the gate records "promoted by owner, independent review owed" and the review stays open.
4. Record the verified SHA in the plan's `gate.md`.
5. Ask for explicit current-chat authorization before commit, merge, push, or branch deletion.
6. Fast-forward `{{PROD_BRANCH}}` to `{{DEV_BRANCH}}` (`git merge --ff-only {{DEV_BRANCH}}`) and push only when authorized. If `{{PROD_BRANCH}}` has commits `{{DEV_BRANCH}}` lacks, merge `{{PROD_BRANCH}}` into `{{DEV_BRANCH}}` first and re-verify.
7. Confirm the {{DEPLOY}} deploy, or name the human step it needs (root directory, environment variables).
8. Never force-push. Never promote skipped evidence as complete.

## Safety Rules

- Inspect `git status`, `git diff`, and recent log before commit.
- Stage only intended files.
- Use Conventional Commits naming the plan where relevant (for example `feat(web): PG-01 home hero (plan-01)`).
- Do not push unless explicitly asked.
- Do not use destructive git commands unless explicitly approved.

## Branch Cleanup

- Delete merged local branches with `git branch -d`.
- Keep stacked branches shallow and only when the dependency is real.
