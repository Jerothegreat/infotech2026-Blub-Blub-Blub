# Plan 01 Gate

**Gate status:** Complete but evidence pending

- [ ] FR1.1–FR1.3, FR1.5: eval SM-1 100% cited, SM-2 ≥95% refusals, SM-3 ≥90% correct section (owed: needs `GOOGLE_API_KEY`).
- [ ] FR1.4: Partial Entrance Token Fee question returns `conflict` with both citations against the real model.
- [x] FR2.1, FR2.2: scope filter unit-tested (CBA context excludes CCIS-only sections).
- [x] `uv --directory chatbot run ruff check .` and `uv --directory chatbot run pytest` pass. `pnpm --dir app check` skipped (pnpm not installed; `app/` unchanged except its check script).
- [x] Browser script: TBL copy and widget states checked in headless Edge with a stub model.
- [ ] Owner manual test on the real model and in Telegram.
- [ ] Independent code review: owed.
- [ ] Verified SHA: <sha>. Promoted: <date>.

## Telegram parity feedback (01-17)

- [x] Automated Telegram behavior checks: 15 tests; full chatbot suite 59 passed and ruff clean (2026-10-13).
- [ ] Live Telegram verification of progress updates, reply keyboard, pre-chat description and command Menu after restarting the bot (see evidence script).
- [ ] Independent review of the Telegram adapter changes remains owed.

## Telegram startup reliability (01-18)

- [x] Timeout/retry regressions: 19 Telegram tests; full chatbot suite 63 passed, ruff clean.
- [x] Live token authentication, seven command registrations, command Menu and pre-chat description verified without starting polling or sending user messages.
- [ ] Owner rerun of polling and end-to-end Telegram conversation remains owed.
