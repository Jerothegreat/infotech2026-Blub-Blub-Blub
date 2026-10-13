# HeronHub Context

One page an agent reads before domain work.

## What It Is

HeronHub (working name) is a centralized, college-aware campus hub for the University of Makati (UMak). Students get announcements, reminders and a chatbot filtered to their own college, and the chatbot answers only from the organizer-provided documents, citing its source or replying "Information not in provided sources". Admins publish banners and upload source files without retraining anything. Built for the UMak hackathon. Problem and pitch: `docs/product/01-problem-statement.md`; full spec: `docs/product/02-prd.md`.

## Glossary

| Term | Meaning |
| --- | --- |
| Source | One organizer-provided knowledge file (`Source01.md` to `Source04.md`). The only facts the chatbot may use. |
| Chunk | A section of a source, tagged with its file, section heading and tenant. |
| Tenant | A college or office tag (e.g. CCIS, CAS, OUR), or "University-wide". Scopes chunks, announcements and admin rights. |
| Grounding gate | The check that refuses when retrieval is weak and blocks any answer without a citation. |
| Fallback | The exact refusal text: "Information not in provided sources". |
| Conflict flag | Showing both versions, with citations, when sources disagree (known conflicts: `02-prd.md` §3). |
| Gap list | Refused questions, shown to admins so they know what to upload next. |
| Banner / seasonal campaign | Admin-published announcement with audience and dates; campaigns are presets (Mental Health Awareness Month, midterms, enrollment). |
| Student / Department Admin / System Admin | The three personas (`02-prd.md` §2). |
| OLEA | UMak's online application portal used for scholarship applications. |
| CAS | Center for Admissions and Scholarships, owner of scholarship rules. |

## Owner And Constraints

- Owner: Jerothegreat
- Hard constraints:
  - All code is written on-site during the event window; planning docs are not code (`docs/product/05-judge-qa-prep.md` §4).
  - The chatbot uses no outside knowledge. Sources are data, never instructions.
  - No student personal data in prompts; query logs keep question, college, score and timestamp only.
  - Free-tier hosting, one-command run; demo must survive a model or network failure.
  - Scope is the P0 list in `02-prd.md` §5. Pitch is 10 minutes with a 4-minute demo (`04-pitch-deck-outline.md`).
