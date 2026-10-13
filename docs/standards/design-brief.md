# Design Brief

Filled during playbook step 2 (design first). The tokens and rules here win over any skill default.

## Direction

Operations Console for the Department Admin dashboard. Its compact global bar leaves the work area open, while UMak midnight navy, official yellow, and blue information states make operational status easy to scan on a projector. A subtle orange accent marks flow and escalation without competing with the official palette. Reference: `docs/design/board.html`.

## Tokens

| Token | Value |
| --- | --- |
| `--bg` | `#f7f8fa` neutral field |
| `--fg` | `#060e33` UMak navy 800 |
| `--accent` | `#28336b` UMak navy 500 |
| `--verified` | `#275996` UMak blue 800 |
| `--highlight` | `#fef760` UMak yellow 300 |
| `--orange` | `#e96518` subtle directional accent |
| `--radius` | `8px` |
| `--shadow` | `0 18px 44px rgb(6 14 51 / .15)` used only for the preview frame |

## Type

`Marcellus`, Georgia, serif for page and section titles. `Metropolis`, Arial, sans-serif for controls and body. Heading sizes follow a fixed, compact scale: 31px page title, 21px section title, 16px control heading, 14px body, and 12px metadata. Use 700 weight for actions and labels that require scanning priority.

## Rules

- Motion explains something and turns off under reduced motion. No animated text.
- Placeholders are explicit and labeled; facts are never invented.
- Use navy for primary actions, yellow for selected navigation and highlights, and blue for verified, indexed, or information states. Use orange only for directional emphasis or escalation, not decoration.
- The dashboard starts with direct publish and source-management actions, followed by a small operational summary. Do not add a generic action-queue backlog.
- Announcement history is a flat, date-aware audit list below the summary. It exposes title, audience, status, end date, and an edit or view action.
- Department sources follow announcement history as a second flat list. It exposes source title, tenant, latest indexed version, and a replace action. University-wide sources are not visible in the Department Admin console.
- Use a compact global bar on desktop. Collapse it to a menu on phone-sized layouts.
- Use 38px desktop, 24px tablet, and 16px phone workspace gutters.
- This admin surface is light-only. Do not add a dark-mode toggle or dark-only color tokens.
- The main workspace is one continuous surface: do not place a card inside another card. Use quiet 1px borders and 8px corners to establish hierarchy.
- Shadows are reserved for the preview frame and modal elevation; do not use neumorphic surfaces.
- Keep status changes semantic: success, warning, error, and information states need text labels as well as color.
- Forms keep labels above fields, show inline validation below fields, and always state what data is collected and why. Department Admin announcement forms inherit their audience from the admin tenant rather than asking the admin to choose it.
- Publishing an announcement requires an explicit confirmation modal with a clear return action and the target tenant and active date range.
- A source replacement inherits the Department Admin's tenant and never asks them to select it. Replacement indexing is communicated with a labeled percentage bar. A failure leaves the active source available and presents a retry action.
