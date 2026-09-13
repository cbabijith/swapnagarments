# Custom garment workflows

Settings → Workflow replaces the Account tab. Owners can add, edit, duplicate,
archive and restore reusable workflows, choose a shop default, and select an
optional workflow for each garment. Account details and sign out are available
from the header account menu. Worker sign out remains in the worker shell.

Each workflow has 1–20 named steps, ordered with accessible arrow buttons. Up to
30 workflows (including archived templates) can be stored. “Handled at” selects
one of the five existing workstations responsible for each step; multiple steps
may use the same workstation. Worker skills, capacity estimates, assignment
rules and queue filters continue to use these workstations.

New orders copy the selected workflow's name, revision, step IDs, step names and
workstations into each individual piece. Garments without an override use the
shop default. The order summary previews this selection. Edits to the effective
workflow bump the affected garment revision so stale intake forms must reload.
Existing pieces keep their original definitions, including archived workflows.
Pieces created before workflow configuration retain the original five steps.

Production progress uses the saved step position independently of workstation.
Owner commands compare a workflow version in the locked transaction, preventing
two requests from advancing two same-workstation steps accidentally. Worker
completion checks the existing work version and advances exactly one saved step,
then resets the assignment for the next step. Corrections select a saved step ID;
future steps cannot be skipped. Unconfirmed measurements block production and
remain editable at the first workflow step, even when that step is not Cutting.

Order details, the production board, and worker task cards use saved step names.
The production board remains grouped by responsible workstation. Structured
history stores the before/after step IDs, names and positions alongside station
history, including worker completion of consecutive steps at the same station.

## Storage and architecture

Feature contracts, pure rules, hooks and UI live in `features/workflow`.
Catalogue and workspace services persist the configuration and piece snapshots.
Migration 8 adds nullable JSONB workflow fields, garment workflow references and
history step descriptors. It follows migration 7 for team accounts; neither
migration rewrites existing customer, order, authentication or payment records.
The live storage model is not switched by startup.

The canonical workspace and migration validator preserve the optional data
through JSON/relational rollback and recutover. Schema validation rejects empty
or duplicate steps, unavailable defaults, missing garment references, invalid
progress and inconsistent workstation/step positions. Existing workflow IDs must
be retained and archived rather than deleted.

## Validation

- 31 tests pass, covering existing features plus custom settings, 8-step progress,
  repeated workstations, retry/stale-write protection, corrections, pending
  measurements, worker handoff, scoped reads and lossless rollback/recutover.
- ESLint and TypeScript checks; optimized production build.
- Browser checks pass at 1440px and 390px: adding/editing workflows, reordering
  and removing steps, default and garment selection, duplicate/archive/restore,
  reload persistence, same-workstation progress, and account sign out. They use
  isolated API fixtures; no customer records or real account credentials are
  used for UI tests. No page errors or horizontal overflow were observed.

Local QA script: `.mimosa/verify-custom-workflows.cjs` (ignored test harness).
Screenshots: `output/qa/workflow-{settings,editor}-{local,release}-{width}.png`.
