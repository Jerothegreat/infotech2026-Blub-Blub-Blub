# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Department Admins publish college-scoped announcements and manage official source files. Students receive college-filtered announcements and source-grounded answers. System Admins manage University-wide sources and role boundaries.

## Product Purpose

HeronHub gives the University of Makati one college-aware hub for verified campus information. It helps admins reduce repeated questions by publishing reminders and maintaining a knowledge base that can answer only from organizer-provided sources.

## Positioning

Every chatbot answer is restricted to retrieved source chunks and must expose a file and section citation. Questions outside the sources receive the exact fallback: "Information not in provided sources".

## Operating Context

The primary demo path starts on an admin dashboard. A Department Admin reviews the action queue, publishes a dated announcement to their tenant, and uploads or replaces a source file. The source remains available until the replacement indexes successfully. The workflow explicitly exposes uploaded, chunking, indexed, and failed states.

## Capabilities and Constraints

- All chunks, announcements, queries, and admin rights are tenant-scoped.
- Department Admins can modify only their own tenant. Only System Admins can publish University-wide sources.
- Announcement publishing requires a title, body, audience, start date, and end date.
- Query logs contain question, tenant, retrieval score, and timestamp, without student names in model prompts.
- The demo must remain usable during a model or network failure.
- The P0 source corpus is not yet committed to the repository. Missing source content must remain visibly labeled instead of invented.

## Brand Commitments

HeronHub is a working name for the UMak hackathon. The voice is direct, calm, and clear about what information is verified and what is not covered.

## Evidence on Hand

- Product requirements: `docs/product/02-prd.md`
- Domain glossary: `CONTEXT.md`
- Entity model: `docs/erd.md`
- Judge demonstration notes: `docs/product/05-judge-qa-prep.md`
- No production source files or institutional brand assets are currently available in the repository.

## Product Principles

- Verification is visible at the point of use.
- Tenant boundaries are enforced, not implied by the interface.
- The next admin action should be clearer than the dashboard metric.
- A failed replacement never removes the active source.
- Failure states explain what happened and offer a safe next step.

## Accessibility & Inclusion

The web app must remain readable on a projector and usable by keyboard. Interactive controls require visible focus states, correctly associated labels, status announcements, and WCAG AA contrast.
