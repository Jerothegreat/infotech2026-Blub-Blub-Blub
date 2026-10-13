# HeronsGuide Workflow Documentation

This is the canonical entrypoint for implementation work.

## Routing

```text
docs/workflow/README.md
  -> roadmap.md
  -> plans/plan-XX-*/plan.md
  -> tasks.md
  -> evidence.md
  -> gate.md
  -> verified SHA and promotion
```

**How a build moves (the loop):** [`playbook.md`](playbook.md): requirements, design first (wireframes and a reference board), plan packet, build slices, verify, owner feedback passes, promote, owed list.

Read the owning plan's `plan.md`, `tasks.md`, `evidence.md`, and `gate.md` before changing code or documentation. Supporting design or runbook files are optional and must be linked from `plan.md`. A plan is not complete because source code exists; its evidence and gate files must agree with `traceability/requirements-map.md`.

## Spec-Driven Flow

1. Requirements live in `docs/product/requirements-engineering.md` with stable IDs.
2. `grill-with-docs` resolves open product questions for the next plan. UI work uses `grill-with-design` instead: app flow, ASCII wireframes, and a rendered first-look board, and the owner picks before the plan is approved (playbook step 2).
3. `to-spec` writes the agreed scope into that plan's `plan.md`, naming requirement IDs.
4. `to-tickets` slices the plan into `.scratch/<feature>/issues/`; `tasks.md` indexes them.
5. `implement` builds one ticket at a time (with `tdd` where a seam exists).
6. Observed results go to `evidence.md`, including the browser script (playbook step 5); `code-review` and the independent audit go to `gate.md`.
6a. Owner feedback on a running build becomes one numbered task and one evidence row per pass (playbook step 6).
7. `traceability/requirements-map.md` is updated only after evidence passes.

New plans start as a copy of `plans/plan-00-template/`.

## Active Categories

- `plans/` owns executable plan packets.
- `traceability/` owns the current requirement-to-implementation map.
- `runbooks/` (created when first needed) owns reusable operational procedures.
- `archive/` owns historical snapshots and is not implementation input.
- `playbook.md` owns the build loop; improve it in place after each promotion.

## Status Vocabulary

- `Planned`: artifact or execution has not started.
- `In progress`: work is actively being executed.
- `Partial`: implementation or evidence is incomplete.
- `Complete but evidence pending`: implementation is present but required evidence or review is incomplete.
- `Ready for independent review`: implementation and evidence are ready for audit by a separate session/model.
- `Complete`: required evidence, review, independent result, verified SHA, and promotion record exist.
- `Deferred`: intentionally owned by a later plan.

## Safety

- Preserve unrelated dirty files.
- Do not treat archived documents as current sources of truth.
- Do not commit, merge, push, or delete branches without explicit current-chat authorization.
