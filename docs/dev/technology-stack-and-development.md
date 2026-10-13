# Technology Stack And Development

## Stack

| Layer | Choice | Why |
| --- | --- | --- |
| Web app | Next.js 16.4 (App Router), React 19.3, in `app/` | Scaffolded; one web app per PRD §6 Deployability. Read `app/AGENTS.md`: this Next.js version differs from training data. |
| Language | TypeScript 5 | Scaffold default |
| Styling | Tailwind CSS 4 | Scaffold default; tokens come from `docs/standards/design-brief.md` |
| Lint | ESLint 9 with `eslint-config-next` | Scaffold default |
| Package manager | pnpm 11 (`app/pnpm-lock.yaml`) | `packageManager` field |
| LLM | TBD | Decide in grilling; record in `docs/adr/` |
| Embeddings and vector store | TBD (managed or embedded, tenant-scoped) | PRD §4, §6; record in `docs/adr/` |
| Auth and roles | TBD | FR2.4 needs per-tenant admin rights |
| Tests | None yet | Add a runner with the first executable seam |

## Commands

Run from the repository root.

| Command | Does |
| --- | --- |
| `pnpm --dir app install` | install dependencies |
| `pnpm --dir app check` | typecheck, lint, build (no test script yet) |
| `pnpm --dir app dev` | apply SQLite migrations, then start the local dev server |

## Deploy

Vercel (planned, not set up): root directory `app`, tracks `main`. Env vars TBD once the LLM and vector store are chosen.
