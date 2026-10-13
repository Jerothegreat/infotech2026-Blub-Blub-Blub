# HeronHub Roadmap

**Status:** Active master roadmap
**Canonical requirements:** `docs/product/requirements-engineering.md`

**Active plan:** `plans/plan-01-admin-api/` (Department Admin and System Admin REST API foundation).
**Build loop:** [`playbook.md`](playbook.md)

## Goal

v1 is the live hackathon demo: the P0 requirements (FR1.1, FR1.2, FR1.3, FR1.5, FR2.1, FR2.2, FR2.4, FR3.1, FR4.4) running end to end through the demo script in `docs/product/04-pitch-deck-outline.md`. P1 follows if time allows. Each plan ends with something live, so the product is never half-broken.

## Execution Protocol

Use `docs/agents/skill-policy.md` for skill routing, model routing, and completion gates.

1. Execute one plan at a time.
2. Name the exact requirement IDs in every task and change set.
3. Start behavior changes with a failing test where an automated harness exists.
4. Preserve unrelated dirty changes.
5. Do not mark a requirement implemented from placeholder UI, hard-coded content, or an untested happy path.
6. Update `traceability/requirements-map.md` only after the relevant evidence passes.
7. Commit and push only when the user explicitly authorizes those git operations.
8. Parallel flash-tier sessions each run in their own git worktree and branch (`../<project>-wt/<branch>`); the review tier merges each branch into `dev`. See `docs/standards/git-workflow.md`.

## Plan Sequence

1. Admin API foundation: tenants, role boundaries, announcements, and source lifecycle (Plan 01; FR2.1, FR2.4, FR3.1, FR4.4).
2. Grounded chat over the four sources with citations and refusal (FR1.1, FR1.2, FR1.3, FR1.5).
3. College tenancy and filtered student feed (FR2.2).

## Content And Setup Owed

Everything the owner will supply later. Each item names the file or setting that takes it.

- [ ] Decide where `Source01.md` to `Source04.md` live and commit them: repo layout, `docs/product/requirements-engineering.md`
- [ ] Choose LLM and vector store: `docs/adr/`, `docs/dev/technology-stack-and-development.md`
- [ ] Create the `dev` branch: `docs/standards/git-workflow.md`
- [ ] Lock the design: `docs/standards/design-brief.md`
- [ ] Set up Vercel (root `app`) and env vars: `docs/dev/technology-stack-and-development.md`
- [ ] 20-question grounding test set (SM-1 to SM-3): plan evidence
