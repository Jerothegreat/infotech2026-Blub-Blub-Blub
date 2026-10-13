# HeronsGuide Context

One page an agent reads before domain work.

## What It Is

HeronsGuide (working name) is a centralized, college-aware campus hub for the University of Makati (UMak). Students get announcements, reminders and a chatbot filtered to their own college, and the chatbot answers only from the organizer-provided documents, citing its source or replying "Information not in provided sources". Admins publish banners and upload source files without retraining anything. Built for the UMak hackathon. Problem and pitch: `docs/product/01-problem-statement.md`; full spec: `docs/product/02-prd.md`.

## Glossary

| Term | Meaning |
| --- | --- |
| Source | One organizer-provided knowledge file (`chatbot/kb/Source01.md` to `Source04.md`). The only facts the chatbot may use. |
| Section | A heading-delimited part of a source with an id like `Source01-s037`; the unit the chatbot cites. |
| TBL Hub | UMak's Moodle 5.0 LMS. The chatbot appears there through the embeddable widget. |
| Channel | Where a question came from: `tbl` (TBL Hub widget), `telegram`, or `web`. |
| Tenant | A college or office tag (e.g. CCIS, CAS, OUR), or "University-wide". Scopes sections, announcements and admin rights. |
| Grounding gate | The check after the model: any answer that is empty, uncited, or cites a section it was not given becomes the fallback (ADR 0001). |
| Pipeline | The four steps for each message: guard, rewrite, answer (retrieval plus gate), conversation. |
| Thread | One conversation in the chat inbox; its last 10 turns go with each message. |
| Account section | The signed-in student's own TBL Hub records (classes, deadlines, grades, assessment) as citable `Account-*` sections. Academic fields only (ADR 0002). |
| Fallback | The exact refusal text: "Information not in provided sources". |
| Conflict flag | Showing both versions, with citations, when sources disagree (known conflicts: `02-prd.md` §3). |
| Banner | Admin-published announcement with audience and dates. |
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
