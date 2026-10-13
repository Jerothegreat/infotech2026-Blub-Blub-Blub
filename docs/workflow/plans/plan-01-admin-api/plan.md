# Plan 01: Admin API Foundation

**Status:** Planned
**Owner:** `app/` server API and SQLite persistence
**Dependencies:** The demo uses an opaque server-side Department Admin session. A chosen production auth/session provider must replace it before non-demo admin routes are exposed.
**Requirements:** FR2.1, FR2.4, FR3.1, FR4.4; NFR-02, NFR-03, NFR-05, NFR-06

## Goal

Deliver the REST API required by the Department Admin and System Admin dashboard: tenant and department-admin management, tenant-scoped announcements, and source lifecycle tracking. The API will enforce tenant authorization on the server, use the existing SQLite schema as its starting point, and return stable JSON representations for the Department Admin dashboard to consume.

## Source Of Truth

- `docs/product/02-prd.md` §§2, 4, and 5: FR2.1, FR2.4, FR3.1, FR4.4
- `docs/product/requirements-engineering.md`
- `CONTEXT.md`
- `PRODUCT.md` §§3-5
- `docs/erd.md`
- `docs/standards/design-brief.md` for later dashboard integration
- `app/migrations/0001_init.sql` through `app/migrations/0004_query_analytics.sql`

## Non-Goals

- Student-facing profile, feed, chat, citations, feedback, or notification APIs.
- LLM, embeddings, chunk generation, vector retrieval, or asynchronous file processing.
- System Admin dashboard wiring or visual design work.
- Production authentication UI or accepting a client-provided role, tenant, or user identity as proof of authorization.
- P1 feedback CSV export, cross-college public browsing, and P2 notification delivery.

## Execution Order

## PR Stacking Strategy

```text
main
  └─ feature/admin-api
```

Use one flat feature branch, `feature/admin-api`, created from `main`. Complete all plan phases on that branch, verify the full API contract once, and merge directly to `main` only with explicit authorization; do not create stacked branches or intermediate PR targets.

## Linear Sub-Issue Tracking

Create sub-issues from this plan when ready. Local implementation tickets belong under `.scratch/plan-01-admin-api/issues/` and must name the requirement IDs and the branch stack position.

### 1. Establish the server persistence and authorization seam

- Touch `app/lib/db.ts`, `app/lib/auth/actor.ts`, `app/lib/http/errors.ts`, `app/lib/http/responses.ts`, `app/migrations/0005_admin_api.sql`, and focused tests under `app/lib/**/*.test.ts`.
- Add a single SQLite connection/query boundary, an injected verified-actor seam for tests, typed API errors, and department-admin assignment; every department-admin operation must authorize the target tenant server-side, while system admins alone manage tenants and roles.
- Do not use headers, request bodies, or query strings as production authorization proof; keep the persistence model append-only so source version history is retained after a replacement.

### 2. Implement tenant and department-admin management routes

- Touch `app/app/api/v1/system/tenants/route.ts`, `app/app/api/v1/system/tenants/[tenantId]/route.ts`, `app/app/api/v1/system/users/route.ts`, `app/app/api/v1/system/users/[userId]/route.ts`, `app/lib/system-admin.ts`, and route/service tests.
- Implement `GET`, `POST`, and `PATCH` contracts for departments (tenants) and department-admin accounts, validating request bodies and returning only the documented JSON fields; every route requires a system-admin actor.
- Preserve the existing `departments` and `users` identity model rather than introducing a second tenant table, and prevent a department-admin account from being assigned an invalid role or missing department.

### 3. Implement department publishing routes

- Touch `app/app/api/v1/admin/announcements/route.ts`, `app/app/api/v1/admin/announcements/[announcementId]/route.ts`, `app/lib/announcements.ts`, and route/service tests.
- Implement announcement list, create, update, and archive/delete behavior; validate nonempty title/body, valid audience, valid schedule, and tenant ownership before writes.

### 4. Implement source lifecycle routes with safe replacement semantics

- Touch `app/app/api/v1/admin/sources/route.ts`, `app/app/api/v1/admin/sources/[sourceId]/route.ts`, `app/lib/sources.ts`, `app/lib/uploads.ts`, and route/service tests.
- Implement source listing, multipart upload, replacement, and retirement. Uploaded versions become current in the same transaction that completes the file upload.
- File bytes must be stored through one server-side upload seam. Actual chunking and retrieval remain a later integration.

### 5. Analytics deferred

- Top-question and refused-question analytics are deferred from this plan.

### 6. Verify the HTTP contract and document observed evidence

- Touch `app/package.json` only if adding the first minimal test runner is required, focused tests under `app/**/*.test.ts`, `docs/workflow/plans/plan-01-admin-api/evidence.md`, and `docs/workflow/plans/plan-01-admin-api/gate.md`.
- Add route-level coverage for authorization denials, validation failures, tenant isolation, source replacement safety, and the successful request/response contracts; run the full application check and record observed results, not expected results.
- Keep automated API tests independent of an external auth provider by injecting a verified actor at the authorization seam, but do not weaken production authorization to make tests pass.

## Acceptance Criteria

- [ ] System admins can create, list, and update departments through `/api/v1/system/tenants` routes.
- [ ] System admins can create and update department-admin accounts through `/api/v1/system/users` routes.
- [ ] Department admins can only read or mutate records in their authorized department; cross-tenant access returns a consistent `403` error.
- [ ] Announcement CRUD validates schedules and audiences and persists through the existing announcement model. Seasonal campaign presets are deferred.
- [ ] Source upload, replacement, and retirement immediately expose the uploaded version after the upload completes.
- [ ] Top-question and refused-question analytics are deferred.
- [ ] Invalid payloads return `400` with a stable error payload; missing resources return `404`; unauthorized roles return `403`.
- [ ] Focused API tests pass, followed by `pnpm --dir app check`.
- [ ] `evidence.md` and `gate.md` contain observed verification results before requirements move out of Planned status.
