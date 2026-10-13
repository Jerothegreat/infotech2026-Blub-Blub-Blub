---
name: grill-with-design
description: Grill the user about a new app, page, or redesign, then show a first look before any plan or code - app flow, ASCII wireframes, and a rendered look board (2-3 directions, light and dark, clickable) published as a private Artifact. Use when starting a new project or UI feature, or when the user says "grill with design", "first look", "look template", "wireframe", or "app flow".
---

# Grill With Design

The owner sees the app before any plan is approved or code is written (playbook step 2). This skill writes no production code; its outputs are a flow, wireframes, a look board, and recorded decisions.

## Steps

1. **Grill.** Call the Skill tool for "grilling" (fall back to "grill-me" if it is not installed). Inside a repository with `docs/`, also call "domain-modeling". Ask in **batched rounds, never one question at a time**: put the whole frontier (up to 4 questions) into one selection prompt (AskUserQuestion), recommended option first and marked "(Recommended)". Look up facts in the repo before asking. The first rounds settle the design frontier:
   - who uses it and what they came to do;
   - the 3-7 core screens and the one job of each;
   - the primary flow from entry to goal, plus the empty and error states that matter;
   - platform and size priority (web, mobile, phone-first or desktop-first);
   - which content is real and which needs a labeled placeholder;
   - tone and any reference sites or images.

   Do not ask about colors, type, or layout style in words. The board shows them.

   **References and requirements.** Before the board, fetch 2–4 real sites of the same page type (not only the same industry), record their section order and what they do well, and write `docs/design/references.md`. It names the page type, lists the references, and includes a launch checklist: legal and data (privacy notice, terms, cookie policy and consent, consent at every form, data requests, contact, disclaimers, local privacy law), accessibility, performance, sharing and search, and form reliability.

2. **App flow.** When screens and the primary flow are settled, write a Mermaid `flowchart`: screens are nodes, user actions are edge labels, and the entry and goal are marked.

3. **Wireframes.** Draw ASCII wireframes for each core screen, desktop (about 100 columns) and phone (about 40 columns), with a short component list under each. Save the flow and wireframes in the active plan's `plan.md` under "Design Spec", or in `docs/design/first-look.md` when no plan exists yet. They do not live only in chat.

4. **Structure check.** Show the flow and wireframes, then ask one round: screens, order, and what is on each. Fix the structure before any styling.

5. **First-look board.** Load the `artifact-design` skill, then build one HTML page:
   - a **Flow** view: the app flow as clickable boxes; clicking a screen opens its mock;
   - **2-3 directions** that differ in layout and character, not only color; each renders the same core screens;
   - **real content** from the grilling; missing facts are labeled placeholders ("screenshot soon"), never invented;
   - toggles for **light/dark** and **desktop/390 px phone**;
   - **click-through**: buttons in the mocks move along the primary flow (no backend);
   - each direction lists its **tokens** (colors for both themes, type, radius, shadow, spacing) so the pick becomes the design brief;
   - no animated text; motion turns off under `prefers-reduced-motion`;
   - the **trust layer** in every direction: a full footer (product, company, and legal links, copyright), a cookie bar (Accept / Reject / Customize) when non-essential cookies are planned, consent and a what-we-collect line on every form, and legal links that open an outline of each legal page.

   **Build-ready, so the build can match it 1:1:**
   - frames render at **exact CSS widths**: desktop 1280, tablet 768, phone 390. A "1:1" toggle shows true size; any zoomed-out overview only scales with `transform`, so the layout inside is never reflowed;
   - styling uses **Tailwind (pinned CDN) with the tokens as CSS variables**, and class names match what production will use, so the chosen direction's markup ports straight into components;
   - each direction has a **spec sheet** per breakpoint: container max-width, side gutter, section padding, type scale in px, phone and laptop mockup sizes, breakpoints, and motion (what moves, duration, easing);
   - save the board source in the repo at `docs/design/board.html`. It is the parity reference, together with the Artifact link.

   Publish it with the Artifact tool (private) and give the link. Without an Artifact tool, the saved `docs/design/board.html` is opened locally.

   Alongside the board, write `docs/design/build-overview.md` in plain words: what will be built, page by page and section by section, what each section will do, the tools, what the owner still owes, and the steps from here to launch.

6. **Pick rounds.** Ask in the grilling format: one numbered question per decision (direction, mixes such as "B's layout with A's colors", per-screen changes), each with a recommended answer. Republish the same board URL each round. Record each round as "Round N decisions (YYYY-MM-DD)" in `plan.md`.

7. **Done** when the owner picks a direction and confirms the structure. Then:
   - write the chosen tokens and rules into `docs/standards/design-brief.md`;
   - record the direction in `docs/adr/` if it is hard to reverse;
   - put the board link and `docs/design/board.html` in `plan.md` as the reference for the parity check (playbook step 2.5). The plan's gate includes a **pixel parity check**: Playwright screenshots of the board and the build at 1280, 768, and 390, compared side by side. Structure (section order, column layout, element sizes and positions) must match within 8 px before polish begins; differences are recorded in `evidence.md`;
   - export the chosen direction as plain HTML, `docs/design/board-<direction>.html`, so builders port real markup and the parity check has a fixed target;
   - run `/impeccable init` and `/impeccable document` if Impeccable is installed, pointing them at the brief;
   - hand off to `to-spec`, then `to-tickets`. When the owner builds with cheaper models, write `handoff.md` with a paste-ready prompt per ticket (`templates/flash-prompt.md`).

## Rules

- One batched round at a time (selection prompt, up to 4 questions), each question with a recommended option.
- Structure first, look second.
- Show, don't describe: a rendered option beats a paragraph.
- Never invent a fact. Placeholders are labeled.
- Text on glass or any translucent surface keeps WCAG AA contrast in both themes: keep the glass look (blur, sheen, bright edge) and fix contrast with a deeper tint, never by going opaque. Floating notes over busy content get the deepest tint; panels on bright gradients get a darker tint. Define glass once in CSS with `-webkit-backdrop-filter`.
- No "·" separators between words in copy; use commas, colons, or brackets.
- The board is a throwaway reference. The build follows it 1:1; deviations are proposals.
