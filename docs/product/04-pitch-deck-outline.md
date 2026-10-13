# 10-Minute Pitch Deck Outline

Six slides, 10 minutes, then 5 minutes of judge Q&A. The demo takes 4 of the 10 minutes, so everything else stays short.

| # | Slide | Time | What is on screen | What you say |
| --- | --- | --- | --- | --- |
| 1 | Hook and problem | 1:00 | One scholarship question and the 3 to 4 places a student must look to answer it (OLEA steps, requirement list, endorsing office, building floor) | "To use one scholarship, a student reads four documents and visits two offices. A normal chatbot would just guess." |
| 2 | Solution overview | 1:00 | HeronHub in one picture: one hub, filtered by college, with a grounded assistant and an admin studio | "One place, scoped to your college, that only says what the official documents say." |
| 3 | Live demo | 4:00 | The product (see demo script below) | Narrate each step: question, citation, refusal, filter, admin update |
| 4 | Architecture and grounding guardrails | 1:30 | The architecture diagram from the PRD | Scope filter, retrieval score gate, citation check, injection defense |
| 5 | Impact, scalability, admin usability | 1:30 | KPI table (3 to 4 rows) and a "add a college = add a tag + files" line | Targets, how they are measured, and the 5-minute admin publish |
| 6 | Conclusion and call to action | 1:00 | Roadmap (reminders by email, Filipino language, more colleges) and the ask | "Pilot with one college next term" |

## Demo script (4 minutes, built from the provided sources)

1. **Grounded answer, 60 s.** Ask "What GWA do I need to apply for BS Computer Science?" The bot replies with the Source02 requirements (85% and above GWA, with minimum Math and English grades) and a citation.
2. **Multi-hop lookup, 45 s.** Ask "Who endorses the Varsity Player token fee exemption?" Answer cites Source01 (Athletic Development Center). Follow up with "Where is the Registrar?" and cite Source03 (Admin Building, mezzanine, south wing).
3. **Refusal, 45 s.** Ask something not in the files (for example "Is there an esports scholarship?"). The bot says "Information not in provided sources."
4. **Conflict flag, 30 s.** Ask for the Partial Entrance grant GWA. The bot shows both versions found in Source01 and says they conflict.
5. **College filter and reminders, 30 s.** Switch the student's college and show the feed and seasonal card change.
6. **Admin studio, 30 s.** Publish a monthly banner, toggle "Mental Health Awareness Month", then open the gap list showing step 3's refused question.
