# 10-Minute Pitch Deck Outline

Eight slides, 10 minutes, then 5 minutes of judge Q&A. The demo takes 4 of the 10 minutes, so everything else stays short. The deck itself is the "HeronsGuide Pitch Deck" artifact (claude.ai Slides).

| # | Slide | Time | What is on screen | What you say |
| --- | --- | --- | --- | --- |
| 1 | Title | 0:15 | HeronsGuide: verified answers for every Heron, inside TBL Hub | Team name, one-line promise |
| 2 | Hook and problem | 0:45 | One scholarship question and the 3 to 4 places a student must look to answer it (OLEA steps, requirement list, endorsing office, building floor) | "To use one scholarship, a student reads four documents and visits two offices. A normal chatbot would just guess." |
| 3 | Solution: two sides, one source of truth | 1:00 | Student side (TBL Hub widget + Telegram) and admin side (Department Admin and System Admin dashboard) | "Students ask where they already are. Admins keep the answers current from one dashboard, scoped to their college." |
| 4 | Live demo | 4:00 | The product (see demo script below) | Narrate each step: grounded answer, multi-hop, refusal, conflict, college scope, admin update |
| 5 | How grounding works | 1:00 | The architecture diagram from PRD §4 | Scope filter by college, the whole scoped corpus in context, citation gate, exact refusal, injection defense, friendly rewrite that must keep every number |
| 6 | Admin dashboard and tenancy | 0:45 | Department Admin: announcements and source versions for their own college only. System Admin: colleges and admin accounts | "Add a college = one tenant row, one admin account, and its files." |
| 7 | Impact | 0:45 | KPI table (grounded rate, refusal accuracy, retrieval accuracy, admin speed) | Targets and how the 20-question eval measures them |
| 8 | Roadmap and ask | 0:30 | Live dashboard-to-chatbot sync, signed-in student records (ADR 0002), Filipino answers, gap list, more colleges | "Pilot with CCIS next term." |

## Demo script (4 minutes, built from the provided sources)

Run the chatbot at `http://localhost:8787/demo/tbl-hub/` (local TBL Hub copy) and the dashboard with `pnpm --dir app dev`.

1. **Grounded answer, 50 s (TBL Hub widget).** Ask "What GWA do I need to apply for BS Computer Science?" The bot replies with the Source02 requirements (85% and above GWA, with minimum Math and English grades) and a citation chip. Open "Show thinking" to show the steps.
2. **Multi-hop lookup, 40 s.** Ask "Who endorses the Varsity Player token fee exemption?" Answer cites Source01 (Athletic Development Center). Follow up with "Where is the Registrar?" and cite Source03 (Admin Building, mezzanine, south wing).
3. **Refusal, 30 s.** Ask "Is there an esports scholarship?" The bot says "Information not in provided sources."
4. **Conflict flag, 30 s.** Ask for the Partial Entrance grant GWA. The bot shows both versions found in Source01 and says they conflict.
5. **College scope and Telegram, 40 s.** Switch the widget's college from CCIS to another college and ask a CCIS program question; the answer scope changes. Show the same question answered on Telegram.
6. **Admin dashboard, 50 s.** Log in as the CCIS Department Admin. Publish a dated announcement (confirmation dialog), then replace a source file and show the new version with the old one kept in history. Say: "What we update here also updates in TBL Hub." This sync is narrated, not wired (PRD §4); if a judge asks, use the honest answer in `05-judge-qa-prep.md` §5.

## Backup

If the network or Gemini fails, play the screen recording of this script and keep narrating. The dashboard runs locally and does not need the network.
