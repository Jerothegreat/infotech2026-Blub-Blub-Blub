# Documentation Policy

## Policy

Documentation changes are part of implementation, not cleanup for later.

## Update When

- Behavior changes
- Architecture changes
- Workflow changes
- Build or setup process changes
- Bugs or recurring issues are discovered

## Where To Update

- `docs/product/requirements-engineering.md` for product requirements
- `docs/adr/` for hard-to-reverse decisions
- `docs/standards/implementation-conventions.md` for durable implementation conventions
- `docs/standards/design-brief.md` for design tokens and visual rules
- `docs/dev/technology-stack-and-development.md` for stack and pipeline changes
- `docs/workflow/plans/*` for plan-specific decisions, tasks, evidence, and gates
- `docs/workflow/traceability/requirements-map.md` for the requirement-to-implementation map
- `.scratch/<feature>/issues/*` for temporary execution tickets and investigation notes
- `docs/standards/issue-log.md` for recurring bugs, setup issues, and fixes

## Rule

If the same bug or setup issue could waste future time, write it down once. Create plans only under `docs/workflow/plans/`; Git history preserves retired documents.
