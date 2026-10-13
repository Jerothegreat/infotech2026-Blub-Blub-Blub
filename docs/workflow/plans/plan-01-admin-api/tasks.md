# Plan 01 Tasks

Tickets live in `.scratch/plan-01-admin-api/issues/`. Wave A: 01. Wave B: 02. Wave C: 03. Wave D: 04. Wave E: 05.

- [x] `P01-01` Server persistence and verified-actor seam. Requirements: FR2.1, FR2.4, NFR-02, NFR-06.
- [x] `P01-02` System tenant and department-admin APIs. Blocked by: P01-01. Requirements: FR2.1, FR2.4.
- [x] `P01-03` Department publishing APIs. Blocked by: P01-01. Requirements: FR3.1, FR2.4. FR3.2 deferred.
- [x] `P01-04` Source lifecycle APIs. Blocked by: P01-01. Requirements: FR4.4, NFR-05.
- [x] `P01-05` Contract verification. Blocked by: P01-01, P01-02, P01-03, P01-04. Requirements: NFR-03. FR4.1 and FR4.2 deferred.
- [x] `P01-FB-01` Board feedback: adopt Operations Console, make University-wide sources read-only for Department Admins, inherit the department tenant for source replacement, and use percentage-based indexing progress. Requirements: FR2.4, FR4.4.
- [x] `P01-FB-02` Board feedback: hide University-wide sources from the Department Admin console. Requirements: FR2.4.
- [x] `P01-FB-06` Implement the locked Operations Console board in the app: responsive Department Admin dashboard, announcement editor confirmation, and safe source-replacement states. Requirements: FR2.4, FR3.1, FR4.4.
- [x] `P01-FB-07` Add demo-only hardcoded sign-in routing for the CCIS Department Admin and System Admin dashboards. Requirements: FR2.4.
- [x] `P01-FB-08` Connect the CCIS Department Admin dashboard to its authenticated announcement and source APIs. Requirements: FR2.4, FR3.1, FR4.4.
- [x] `P01-FB-09` Make uploaded sources immediately active; remove the indexing lifecycle from the API and Department Admin dashboard. Requirements: FR4.4.
- [x] `P01-FB-10` Add the UMak System Admin demo account, role-aware session restoration, and System Admin landing route. Requirements: FR2.4.
