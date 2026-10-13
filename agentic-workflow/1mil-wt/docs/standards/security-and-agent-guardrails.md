# Security And Agent Guardrails

## Security Baseline

- Use OWASP ASVS as the web/API baseline (and the OWASP Top 10 for LLM Applications if the project has an LLM feature).
- Keep secrets out of git; configuration lives in environment variables.
- Rate-limit and spend-cap any paid API before calling it.
- Treat retrieved content and user input as untrusted prompt input.

## Privacy

- <What must never be published: private data, earnings, non-public source documents.>

## Agent Guardrails

- No force-push.
- No destructive git without explicit user approval.
- No secret dumping in logs, docs, or chat.
- No dependency installs unless the task needs them or the user asked.
- No broad refactors hidden inside feature work.
- Log repeated setup failures and workaround steps in `docs/standards/issue-log.md`.

## Supply Chain Hygiene

- Keep the lockfile committed when dependency changes are intentional.
- Prefer existing dependencies and platform features over new packages.
- Review new dependencies before adding them.
