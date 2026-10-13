# HeronHub Requirements Engineering

**Source:** `docs/product/02-prd.md` (HeronHub PRD), with KPIs from `docs/product/03-impact-analysis-kpis.md`. This file is the canonical index of requirement IDs. The requirement text lives in the PRD and is not copied here; cite the IDs below in plans, tickets, commits and the traceability map. Stack lives in `docs/dev/technology-stack-and-development.md`; visual rules live in `docs/standards/design-brief.md`.

## Product Overview

A college-aware campus hub whose chatbot answers only from the organizer sources (`Source01.md` to `Source04.md`) and says so when it cannot. See `docs/product/01-problem-statement.md`.

### Goals

- G-1 Every answer is grounded in and cites a provided source (PRD §1, §4).
- G-2 Students see only the content and reminders that apply to their college (PRD §1).
- G-3 Admins keep announcements and AI knowledge current in minutes (PRD §1).

### Success Metrics

Defined in `03-impact-analysis-kpis.md`. Demo-time metrics:

- SM-1 Grounded-answer rate: 100% of answers cite a source.
- SM-2 Refusal accuracy: 95%+ of out-of-scope test questions refused.
- SM-3 Retrieval accuracy: 90%+ of in-scope test questions cite the correct section.
- SM-4 Admin speed: banner published in under 5 minutes; source file answerable within 2 minutes.

## Functional Requirements

IDs and priorities are defined in `02-prd.md` §5. P0 = live demo, P1 = if time allows, P2 = pitch roadmap only.

| Group | IDs | P0 | P1 | P2 |
| --- | --- | --- | --- | --- |
| FR1 Strict source-grounded chatbot (RAG) | FR1.1 to FR1.6 | FR1.1, FR1.2, FR1.3, FR1.5 | FR1.4 | FR1.6 |
| FR2 Multi-tenant college segmentation | FR2.1 to FR2.4 | FR2.1, FR2.2, FR2.4 | FR2.3 | |
| FR3 Dynamic content and reminders | FR3.1 to FR3.4 | FR3.1 | FR3.2, FR3.3 | FR3.4 |
| FR4 Admin analytics and feedback | FR4.1 to FR4.4 | FR4.4 | FR4.1, FR4.2, FR4.3 | |

## Non-Functional Requirements

The PRD's §6 table has no IDs; these IDs map to its rows in order.

| ID | PRD §6 area |
| --- | --- |
| NFR-01 | Latency |
| NFR-02 | Source privacy |
| NFR-03 | Data protection |
| NFR-04 | Deployability |
| NFR-05 | Reliability |
| NFR-06 | Maintainability |
| NFR-07 | Accessibility |

## Knowledge Base

`Source01.md` (scholarships), `Source02.md` (CCIS requirements, college list), `Source03.md` (campus map), `Source04.md` (office profiles). Scope tags and known inconsistencies: `02-prd.md` §3. The sources are organizer data: do not edit or "fix" them; the bot flags their conflicts instead.
