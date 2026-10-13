# HeronsGuide: Product Requirements Document

HeronsGuide (earlier working name: HeronHub) is a college-aware campus guide for UMak. Its AI answers only from official documents and says so when it cannot. It has two parts:

- **Student side:** the HeronsGuide assistant, embedded in TBL Hub (UMak's Moodle LMS) as a floating chat widget and dashboard block, and also available as a Telegram bot.
- **Admin side:** the HeronsGuide admin dashboard (`app/`), where Department Admins publish announcements and manage source files, and System Admins manage colleges and admin accounts.

## 1. Product Vision & Success Metrics

**Vision:** every UMak student, faculty member and admin gets a verified answer or the right reminder in under a minute, from one place, filtered to their own college.

| Outcome | Student | Admin | Target (hackathon-stage, to validate) |
| --- | --- | --- | --- |
| Answer accuracy | Trusts what the bot says | Does not field repeat questions | 100% of answers cite a source chunk; 0 uncited answers |
| Refusal quality | Told when the sources do not cover it | Sees which gaps to fill | Out-of-scope questions refused in 95%+ of test cases |
| Deadline awareness | Sees reminders for own college | Reaches the right audience | Reminder visible within 1 click of opening the hub |
| Admin speed | n/a | Publishes a monthly update | Under 5 minutes from login to live banner |
| Knowledge freshness | Gets current rules | Uploads a revised file | New file answerable within 2 minutes of upload (designed flow; see §4 "Dashboard-to-chatbot sync") |

Targets are design goals for the demo and pilot, not measured results.

## 2. User Personas

| Persona | Who | Main job to be done | Pain today | Key needs |
| --- | --- | --- | --- | --- |
| Student | A CCIS freshman or shifter, an incoming scholar | Find a requirement, office or deadline without walking the building | Info split across documents, offices and floors | Cited answers, college-filtered feed, reminders |
| Department Admin | A dean's office or center staff member (e.g. CCIS, CAS, OUR) | Publish updates and keep the AI's sources current | Repeats the same answers; cannot see what students ask | Announcement editor, source upload and replace with version history, scoped to their own college |
| System Admin | CIT / ITSO staff running the platform | Add colleges, set roles, keep the system safe | No single place to manage access and sources | College (tenant) setup, Department Admin accounts, University-wide sources |

## 3. Knowledge Base Scope

The four organizer files cover scholarships, college admission requirements, campus offices and building maps. Tag every chunk with its source file and a college or office so retrieval can be scoped.

| File | Contents | Natural scope tag |
| --- | --- | --- |
| Source01 | Scholarships: basic requirements, OLEA application steps, 25+ grant types, FAQ | Scholarships / CAS |
| Source02 | CCIS program requirements (BSCS, BSIT, BSIS, two diplomas); list of 16 colleges | CCIS / admissions |
| Source03 | Campus map: offices and rooms by building, floor and wing | Campus navigation |
| Source04 | Office profiles: heads, functions, services (OUR, CIT, HRMO, GSO, clinic, CSOA...) | Offices / services |

**Known inconsistencies the bot must handle.** These are an asset for the demo: they prove the guardrails by showing the bot flags conflicts instead of picking one silently.

- Source01 FAQ says all incoming undergraduates are automatically scholars with no application. The scholarship sections describe an application through OLEA with per-type requirements.
- The "Partial Entrance Token Fee Exemption Grant" description repeats the Full grant wording (Highest Honor, GWA 98 to 100), while its requirements say High Honor, GWA 95 to 97.
- The first "Persons with Disability R.A. 9442" entry describes military dependents (P.D. 577). The second entry matches R.A. 9442 and mentions CIE endorsement.
- The "CCAPS Special Programs (15%)" entry is titled 15% but its text says Tier 4, 25% exemption, duplicating the 25% entry.
- The "Theater Artist" entry reuses Sister City Scholar text. The "Corps of Sponsor" entry names CNSTP in the description and CCA in the requirement.
- Office names differ across files (CDPRM vs CAIG; CBFS vs CBA; IOA vs Institute of Accountancy and Finance). Source04's Center for Research Management paragraph ends mid-sentence.

**Rule:** when retrieved chunks disagree, the bot shows both with citations and says the sources conflict, then points to the owning office (for scholarships, the Center for Admission and Scholarships).

## 4. System Architecture & Data Flow

The v1 architecture follows ADR 0001 (`docs/adr/0001-chatbot-python-langchain-gemini-no-vector-store.md`). It replaces the earlier embeddings, vector store and similarity-score design.

```mermaid
flowchart LR
  subgraph Admin["Admin dashboard (Next.js, app/)"]
    DA[Department Admin] --> AN[Announcements<br/>title, body, dates<br/>own college only]
    DA --> SRC[Source upload / replace<br/>version history kept]
    SA[System Admin] --> TEN[Colleges and<br/>admin accounts]
    AN --> DB[(SQLite<br/>heronhub.sqlite)]
    SRC --> DB
    TEN --> DB
  end
  subgraph Bot["HeronsGuide chatbot (Python, chatbot/)"]
    KB[(Knowledge base<br/>Source01-04, split by heading,<br/>tagged by source + college)]
    Q[Student question<br/>TBL Hub widget or Telegram] --> G1[Guard + rewrite<br/>language, thread history]
    G1 --> SC[Scope: own college<br/>+ University-wide sections]
    KB --> SC
    SC --> ANS[Gemini answer<br/>structured, cited]
    ANS --> GATE{Citation gate<br/>cited ids really provided?}
    GATE -->|yes| OK[Answer with citations<br/>or conflict flag]
    GATE -->|no| NO[Information not in<br/>provided sources]
    OK --> FR[Friendly rewrite<br/>numbers and links must survive]
    Q -.-> LOG[(Query log<br/>no names)]
  end
  DB -. designed sync, narrated in demo .-> KB
```

**Admin dashboard.** A Next.js app backed by SQLite. Department Admins sign in and see only their own college: they publish dated announcements and upload or replace source files. Every replacement is a new version, and the previous version stays active until the new one is ready. System Admins create colleges and Department Admin accounts. Tenant checks run on the server, not in the UI.

**Chatbot.** A Python service (LangChain, Gemini, FastAPI). Every channel calls the same `POST /chat` API.
- The sources are split into sections by heading, and each section is tagged with its source file, section path and college.
- A question is checked (guard), rewritten into a standalone query (handling Filipino and thread history), then answered from every section in the student's scope. The whole corpus fits in the model context, so there is no vector store.
- **Grounding is enforced after the model.** A reply is shown only if it cites at least one section and every cited section was actually provided. Otherwise the reply is exactly "Information not in provided sources".
- A final step rewrites the answer in a warm tone. The rewrite is used only if every number and link from the verified answer survives.

**Delivery channels.**
- **TBL Hub:** one `<script src=".../widget.js" data-college="CCIS">` tag added through Moodle's Additional HTML. It provides a floating chat panel on every page and an "Ask HeronsGuide" block on the dashboard. `chatbot/demo/tbl-hub/` is a local copy of TBL Hub showing the placements.
- **Telegram:** a bot that runs the same pipeline, with `/college`, `/new` and suggested-reply buttons.

**Dashboard-to-chatbot sync.** In the hackathon build the dashboard and the chatbot keep separate stores. The chatbot answers from `chatbot/kb/`, and dashboard uploads do not yet reach it. The designed flow is "update a source in the dashboard, and TBL Hub answers from it". The demo narrates this flow; it is not wired. Building it means having the chatbot load active source versions from the dashboard database in place of `chatbot/kb/`.

**Prompt-level grounding.** The system prompt allows only the provided sections as context and requires a citation (file and section) per claim. It forbids outside knowledge and requires the exact fallback "Information not in provided sources" when the sections do not answer the question. Sources and questions are wrapped and escaped as data, so instructions inside them are never followed.

## 5. Functional Requirements

Priority: **P0** = needed for the live demo, **P1** = build if time allows, **P2** = mention in the pitch as roadmap.

### FR1. Strict source-grounded chatbot (RAG)

| ID | Requirement | Priority |
| --- | --- | --- |
| FR1.1 | Answer only from retrieved chunks of organizer-provided files; no general-knowledge fallback. | P0 |
| FR1.2 | Every answer shows citations: file name and section heading (e.g. "Source01, Dean's Lister (Full)"). | P0 |
| FR1.3 | If the provided sections do not answer the question, or the reply fails the citation gate, reply exactly "Information not in provided sources" and name the office likely to know, only if the sources state it. | P0 |
| FR1.4 | When retrieved chunks conflict, show both with citations and flag the conflict (see Knowledge Base Scope). | P1 |
| FR1.5 | Block prompt injection: retrieved text and user input are wrapped as data; system rules cannot be overridden; output is checked for a citation before display. | P0 |
| FR1.6 | Answers in the language of the question (English or Filipino) while quoting sources as written. | P2 |

### FR2. Multi-tenant college and department segmentation

| ID | Requirement | Priority |
| --- | --- | --- |
| FR2.1 | Every chunk and announcement carries a tenant tag: a college or office, or "University-wide". | P0 |
| FR2.2 | A student's profile sets their college (e.g. CCIS); retrieval and the feed show that college plus University-wide content. | P0 |
| FR2.3 | Student can switch the filter to browse another college's public content. | P1 |
| FR2.4 | Department admins can publish and edit only within their own tenant. | P0 |

### FR3. Dynamic content and reminders

| ID | Requirement | Priority |
| --- | --- | --- |
| FR3.1 | Monthly banner/announcement editor: title, body, audience (college), start and end date. | P0 |
| FR3.2 | Seasonal campaign toggles with presets (Mental Health Awareness Month, midterms week, enrollment deadlines) that pin a themed card for the chosen audience. | Deferred |
| FR3.3 | Reminder cards sorted by date, with a visible "ends in N days" label. | P1 |
| FR3.4 | Optional email or push reminder before a deadline. | P2 |

### FR4. Admin analytics and feedback retrieval

| ID | Requirement | Priority |
| --- | --- | --- |
| FR4.1 | Top questions by college and period, from the query log. | Deferred |
| FR4.2 | List of refused questions ("gaps") so admins know what to upload next. | Deferred |
| FR4.3 | Thumbs up/down and a short feedback form on every answer; admins can export submissions as CSV. | P1 |
| FR4.4 | Source management: upload, replace and retire a source file, keeping version history; the uploaded version becomes active when the upload completes. Reaching the chatbot is the designed sync in §4. | P0 |

### FR5. Signed-in student context (ADR 0002, proposed)

| ID | Requirement | Priority |
| --- | --- | --- |
| FR5.1 | A signed-in TBL Hub student can ask about their own classes, rooms, deadlines, submission status, grades and assessment, with answers cited to their records. The demo uses one fictional student. | P1 |
| FR5.2 | The widget shows a "My account" view of those records, including class Meet links. | P1 |
| FR5.3 | The widget states that it is a guide, not a substitute for the student's own judgment or official offices. | P0 |

## 6. Non-Functional Requirements

| Area | Requirement | How we meet it in a hackathon build |
| --- | --- | --- |
| Latency | First visible progress in about 1 second; full answer in a few seconds on the demo network | Small corpus in context; `/chat/stream` shows each pipeline step as it finishes |
| Source privacy | Staff-only documents never leak to students; no personal identifiers sent into prompts | Tenant tags enforced before the model sees any section; with ADR 0002, only the signed-in student's academic fields, never address, guardian, birth date, email or student number |
| Data protection | Query logs minimized; follows the university's data privacy policy (CAIG oversees it) | Store question, channel, college, status, citations and timestamp; no names |
| Deployability | One-command run, free-tier hosting, nothing that needs hours of setup | Two services: `pnpm --dir app dev` (dashboard, SQLite) and one Uvicorn command (chatbot); TBL Hub needs only a script tag |
| Reliability | Demo survives a model or network failure | Clear error state (503 with a message); Telegram retries on startup; a recorded backup of the demo path |
| Maintainability | Adding a college is configuration, not code | Tenant table and tag-driven filters |
| Accessibility | Readable on a phone and a projector | Responsive layout, high-contrast theme, large type |
