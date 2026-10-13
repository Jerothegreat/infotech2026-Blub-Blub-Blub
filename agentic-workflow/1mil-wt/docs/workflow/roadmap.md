# {{PROJECT}} Roadmap

**Status:** Active master roadmap
**Canonical requirements:** `docs/product/requirements-engineering.md`

**Active plan:** [Plan 00](plans/plan-00-template/plan.md)
**Build loop:** [`playbook.md`](playbook.md)

## Goal

<What v1 ships, as requirement ID ranges.> Each plan ends with something live, so the product is never half-broken.

## Execution Protocol

Use `docs/agents/skill-policy.md` for skill routing, model routing, and completion gates.

1. Execute one plan at a time.
2. Name the exact requirement IDs in every task and change set.
3. Start behavior changes with a failing test where an automated harness exists.
4. Preserve unrelated dirty changes.
5. Do not mark a requirement implemented from placeholder UI, hard-coded content, or an untested happy path.
6. Update `traceability/requirements-map.md` only after the relevant evidence passes.
7. Commit and push only when the user explicitly authorizes those git operations.
8. Parallel flash-tier sessions each run in their own git worktree and branch (`../<project>-wt/<branch>`); the review tier merges each branch into `{{DEV_BRANCH}}`. See `docs/standards/git-workflow.md`.

## Plan Sequence

### Plan 00: <Name>

**Detailed plan:** `plans/plan-00-template/plan.md`
**Requirements supported:** <IDs>
**Outcome:** <What is live when this plan passes.>

## Content And Setup Owed

Everything the owner will supply later. Each item names the file or setting that takes it.

- [ ] <item>: <file or setting>
