# Requirements Map

Current requirement-to-implementation status. Update a row only after the owning plan's evidence passes. Statuses follow `docs/workflow/README.md`. Requirement text: `docs/product/02-prd.md` §5 and §6.

| ID | Requirement | Owning plan | Status | Evidence |
| --- | --- | --- | --- | --- |
| FR1.1 | Answer only from retrieved source chunks | 01 | In progress | |
| FR1.2 | Citations on every answer | 01 | In progress | |
| FR1.3 | Exact fallback when sources do not answer | 01 | In progress | |
| FR1.4 | Flag conflicting sources (P1) | 01 | In progress | |
| FR1.5 | Prompt-injection defense and citation check | 01 | In progress | |
| FR1.6 | Answer in the question's language (P2) | TBD | Deferred | |
| FR2.1 | Tenant tag on chunks and announcements | Plan 01 (chatbot) | In progress | |
| FR2.2 | Student college scopes retrieval and feed | Plan 01 (chatbot) | In progress | |
| FR2.3 | Browse another college's content (P1) | Plan 01 (chatbot) | In progress | |
| FR2.4 | Admins edit only their tenant | Plan 01 (admin API) | Ready for independent review | P01-FB-08: server-verified Department Admin session and tenant-scoped dashboard API integration. |
| FR3.1 | Monthly banner editor | Plan 01 (admin API) | Ready for independent review | P01-FB-08: Department Admin dashboard publishes announcements through the protected API. |
| FR3.2 | Seasonal campaign presets | Deferred | Deferred | Removed from Plan 01 scope. |
| FR3.3 | Reminder cards with "ends in N days" (P1) | TBD | Planned | |
| FR3.4 | Email or push reminders (P2) | TBD | Deferred | |
| FR4.1 | Top questions by college and period | Deferred | Deferred | Removed from Plan 01 scope. |
| FR4.2 | Gap list of refused questions | Deferred | Deferred | Removed from Plan 01 scope. |
| FR4.3 | Answer feedback and CSV export (P1) | TBD | Planned | |
| FR4.4 | Source upload, replace, retire with re-index | Plan 01 | Ready for independent review | P01-FB-08: Department Admin dashboard uploads and replaces sources through the protected API. |
| NFR-01 | Latency | TBD | Planned | |
| NFR-02 | Source privacy | TBD | Planned | |
| NFR-03 | Data protection | TBD | Planned | |
| NFR-04 | Deployability | TBD | Planned | |
| NFR-05 | Reliability | TBD | Planned | |
| NFR-06 | Maintainability | TBD | Planned | |
| NFR-07 | Accessibility | TBD | Planned | |
