# 0002: Signed-in student records as chatbot context

**Status:** Proposed (needs owner sign-off: it changes NFR-02)
**Date:** 2026-10-13

## Context

HeronsGuide runs inside TBL Hub (Moodle), where the student is already logged in. Students want answers about their own term: classes and rooms (from the Certificate of Registration), deadlines and submission status, grades so far, and assessment and scholarships. PRD §6 NFR-02 says no student personal data goes into prompts.

## Decision

- **How records arrive.** TBL Hub gives the widget a short-lived signed token for the logged-in user (`data-student-token`). The widget sends it as `X-Student-Token`. The server resolves it through an `AccountProvider`:
  - **Production:** Moodle web services (enrolled courses, assignments and submission status, grade items, calendar action events) plus the registrar's COR.
  - **Demo:** `SampleAccountProvider` serves one fictional student (`chatbot/samples/sample_account.json`) for the demo token.
- **What goes into prompts.** Only academic fields become model context, as citable `Account-*` sections: name, college, program, year, section, term, classes and rooms, deadlines and status, grades, and assessment.
  - Address, guardian, birth date, email and student number are never sent to the model or to the widget.
- **What gets stored.** Records are fetched per request. Nothing is stored server-side beyond the existing query log (question, college, status, citations; no names).
- **Grounding.** The same citation check applies. The model may list recorded values but must not compute GWAs or predictions the records don't state.
- **Guests.** Guests and Telegram users get no Account sections, so questions about "my" records are refused.
- **Product framing.** The widget says plainly that it is a guide, not a second brain.

## Consequences

- NFR-02 becomes "no personal identifiers in prompts; academic records only for the signed-in student". The owner must accept this before it ships.
- Real deployment needs a Moodle web-service token with read-only scope, token signing between TBL Hub and the chatbot, and a data-privacy review with CAIG.
- The real COR PDF is personal data. It stays out of Git (`.gitignore`) and out of published artifacts.
