# Implementation Conventions

Durable conventions. `AGENTS.md` carries the short form.

- **Content is data.** <Where content files live and which pages read them.>
- **Design tokens only.** Values come from `docs/standards/design-brief.md`.
- **Secrets are server-only.** <How env vars are read; which prefixes are client-visible.>
- **Accessibility.** Keyboard access and `prefers-reduced-motion` in every interactive component.
- **Testing seams.** <Which modules get test-first: parsers, content rules, pure builders.>
- **Dependencies.** Prefer existing dependencies and platform features over new packages.
