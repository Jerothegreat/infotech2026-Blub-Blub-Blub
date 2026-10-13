# HeronHub Admin Dashboard Build Overview

## What Will Be Built

The first implementation targets the Department Admin desktop dashboard. It has three connected routes or views:

1. **Admin Dashboard:** The entry point. It prioritizes direct publishing and source management, then shows source health, active announcements, announcement history, and active sources. The primary actions open the announcement editor and source upload flow.
2. **Announcement Editor:** A form that requires title, message, start date, and end date. Department Admins can publish only to their own tenant, which is shown in the consent copy rather than selected in a field. Publishing uses a confirmation modal.
3. **Source Upload:** A source replacement flow for the Department Admin's tenant. The Department Admin console lists only department-owned sources. It displays percentage-based indexing progress and a failure state. The current active document remains retrievable until the replacement indexes successfully.

## Design Directions

- **Operations Console:** A compact top navigation layout with more open workspace and stronger semantic state emphasis. It is the approved direction for the projector-friendly Department Admin dashboard.

## Tools

- Next.js 16 and React 19
- Fluent UI React components for accessible application controls
- Tailwind v4 for layout utilities alongside scoped application CSS
- The local Impeccable skill for visual quality review and its design detector after implementation

## Owner Decisions Still Needed

- Supply the official UMak logo and any binding institutional color or typography rules.
- Commit the four source files, then choose the retrieval model and vector store.
- Confirm the actual privacy notice, terms, data-request contact, and any non-essential analytics cookies before release.

## Path To Launch

1. Keep the approved Operations Console direction aligned with `docs/standards/design-brief.md`.
2. Create the active plan packet and map each implementation task to its requirement IDs.
3. Build tenant enforcement and the announcement workflow with tests.
4. Build file versioning and percentage-based indexing progress with a non-destructive replacement guarantee.
5. Add grounded retrieval, citations, exact fallback behavior, and query-gap logging.
6. Run desktop and phone browser checks, the Impeccable detector, independent review, and the workflow evidence gate.
