# Build Playbook

**Status:** Active. This is the reusable build loop for HeronHub.
**Scope:** Project-agnostic. Copy this file into a new repository and replace the paths in "This Repository" at the end. Repository rules (`AGENTS.md`, the roadmap, and plan packets) still decide *what* gets built; this file decides *how* a build moves from idea to production.

The loop was distilled from the 1mil.dev Plan 02a retro-OS redesign: board first, five owner feedback passes, then promotion. Improve it in place; see "Improving The Playbook".

## The Loop

```text
1 Requirements ─▶ 2 Design first ─▶ 3 Plan packet ─▶ 4 Build slices ─▶ 5 Verify
                       ▲                                                  │
                       │                                                  ▼
                       └──── 6 Owner feedback pass (repeat) ◀──── owner reviews
                                                                          │
                                         7 Promote ◀── "ship it" ─────────┘
                                             │
                                             ▼
                                   8 Owed list + retro
```

### 1. Requirements

- Every behavior has a stable ID (`PG-`, `SF-`, `CM-`, `AI-`, `NFR-`) in one requirements file.
- A plan names the IDs it touches; nothing is "done" without evidence against an ID.

### 2. Design First (UI work)

The owner sees the design before any plan is approved or code is written. The `grill-with-design` skill runs this whole step.

1. **UI/UX spec with wireframes.** Write the page layout as ASCII wireframes (desktop and phone), the component anatomy, the toolkit rules (for example tilt, overlap, and color rules), tokens for light and dark, and the UX rules (reading order, keyboard, reduced motion). Put it in the plan, not in chat.
2. **Reference board.** Publish one private page that renders 2–3 directions side by side, in light and dark, with real content and links to references. Ask the owner to pick; do not ask them to imagine.
3. **Decision rounds.** Record each round of picks in `plan.md` under "Round N decisions", with dates. Ask one round of questions at a time, each with a recommended option.
4. **Lock.** When the owner says "lock it": write the design brief and an ADR, export the chosen direction as plain HTML (`docs/design/board-<direction>.html`) so builders port real markup, run `/impeccable init` and `/impeccable document` (they point at the brief), then write the plan and tickets.
5. **Parity check.** When the build exists, take Playwright screenshots of the board (`docs/design/board.html`) and the build at the same widths (1280, 768, 390) and compare them side by side. "Close" is not "1:1": structure (order, columns, sizes, positions) must match within 8 px; fix structure first, then polish. The board is built at exact CSS widths with production class names and tokens, so the build ports its markup instead of reinterpreting it.

Skip this phase only for work with no visual change.

### 3. Plan Packet

Each plan has four files: `plan.md` (scope, decisions, design spec, out of scope), `tasks.md` (one line per task with ID, summary, and requirement IDs), `evidence.md` (observed results only), and `gate.md` (checklist and status). Tickets for parallel or delegated work go in a local scratch folder; `tasks.md` indexes them.

### 4. Build In Slices

- **Inline by default.** Use one session in one checkout. Delegate only isolated, independently verifiable tickets.
- **Test first at seams.** Content rules, parsers, and pure builders get a failing test before the code. Record the red-then-green result in the evidence row.
- **Content is data.** Pages read content files. Missing facts stay hidden or show a labeled placeholder ("screenshot soon", "details soon"). Never invent a fact.
- **One shared component per pattern.** When a third place needs the same behavior (for example a maximize popup), extract it then, not before.
- **Docs move with the code.** The same change updates the design brief, requirements, plan packet, and issue log.

### 5. Verify (every slice and every pass)

Run these and paste the results into `evidence.md`:

- **Static checks:** typecheck, lint, unit tests, production build (one workspace command).
- **Browser script** (Playwright or a headless browser), at minimum:
  - two viewports × two themes (1280 light, 390 dark);
  - horizontal overflow = 0 px;
  - no console errors;
  - each new interaction: open, switch, Esc closes, focus returns to the opener;
  - reduced motion: no animation, content still visible;
  - screenshots of each new surface, actually looked at.
- **Design QA:** `/impeccable critique` and `/impeccable audit` on each new surface; findings go in the evidence row (see Impeccable in `docs/agents/skill-policy.md`).
- **Pass/fail is observed, never expected.** If a check was skipped, the evidence row says so.

### 6. Owner Feedback Pass

The owner reviews the running build and sends a batch of notes. Each batch becomes one pass:

1. Restate the batch as a numbered list. Name any interpretation you chose (for example, "scroll navigation" read as scrollbars), and note any reversal of an earlier decision.
2. Add one task line (for example `RO-14 Owner feedback pass 5: ...`) and a "Feedback Pass N" note in `plan.md` if a decision changed.
3. Build, then verify (step 5), then append one evidence row.
4. Report back in the same order as the owner's list: what changed, what was assumed, what the owner must supply.

Keep passes small and frequent. A pass that would change architecture goes back to step 2 or 3.

### 7. Promote

When the owner says ship:

1. Run the workspace check and `/impeccable polish`; the evidence row records the results.
2. Remove any temporary content or test fixtures.
3. Commit on the development branch (Conventional Commits naming the plan).
4. Fast-forward the production branch to it and push. This happens only on the owner's explicit word in the current chat.
5. Gate: record the SHA. If the owner promotes before independent review, write "promoted by owner, independent review owed" and keep that item open.
6. Confirm the deploy, or name the human step it needs (for example the hosting root directory or environment variables).

### 8. Owed List And Retro

- Everything the owner will "fix later" goes into one **Content And Setup Owed** list in the roadmap: missing facts, media, credentials, and environment variables. Each item names the file or setting that takes it.
- After promotion, add 1–3 lines to "Improving The Playbook": what slowed the build, and the rule that would have prevented it.

## Rules Learned

- Wireframes before plans; a board before code. The owner rejected text-only plans until a wireframe existed.
- Show options rendered, in both themes, with real content.
- Follow the approved board 1:1; deviations are proposals, not defaults.
- No animated text. Motion must explain something (draw-in, fill, maximize), and it turns off under reduced motion.
- Placeholders are explicit and labeled; facts are never invented.
- A popup is for browsing within a page (projects, experience, full road). Long reads that need a shareable URL get their own page (blog posts).
- An unfinished feature ships with a visible "under construction" sign rather than a broken or fake answer.
- Log every setup or tooling surprise once in the issue log.

## Improving The Playbook

Append newest first. Each entry says what happened and the rule now in the loop.

- 2026-10-12: The first Alunsina board showed AI features only at the surface (booking) and boxed every section in glass cards. Rules: read the product's own AI/plan docs and show the real feature mechanics (what the AI reads, what it proposes, who approves, what the app then does); vary sections with full-width fills instead of a card per block; give long pages a navbar with active-section state and a mobile section-chip row.
- 2026-10-12: A build made from an approved board did not match it at real screen sizes, because the board was a loose visual rather than a size-exact spec. The rule is now: boards render at exact CSS widths with production class names, tokens, and a per-breakpoint spec sheet, and the gate requires a screenshot parity check at 1280, 768, and 390 (step 2.5).
- 2026-10-09 (1mil.dev): Plan 02a needed six rounds before the owner saw the intended look, because the first proposal was text only. The rule is now step 2.1–2.2: wireframes and a rendered board come first.
- 2026-10-09: Overflow from decorations (stickers, stamps) hanging past the phone edge went unnoticed across passes. The rule: measure overflow on a fresh page load at 390 px in every pass (step 5).

## This Repository

| Playbook term | HeronHub path |
| --- | --- |
| Requirements file | `docs/product/requirements-engineering.md` |
| Plan packets | `docs/workflow/plans/plan-XX-*/` |
| Design spec and tokens | `docs/standards/design-brief.md` |
| Decisions | `docs/adr/` |
| Issue log | `docs/standards/issue-log.md` |
| Owed list | "Content And Setup Owed" in `docs/workflow/roadmap.md` |
| Workspace check | `pnpm --dir app check` |
| Branches | `dev` (development) → `main` (production, Vercel) |
| Example run | 1mil.dev `docs/workflow/plans/plan-02a-retro-os/` |
