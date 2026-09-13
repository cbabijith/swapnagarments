# Swapna Garments — responsive website

A Next.js website for the tailoring shop, with a desktop sidebar, mobile bottom
navigation, and a server-side connection to the existing Railway PostgreSQL
database. The Hono and Flutter workspaces are not required to run this website.

## Run locally

From the repository root:

```bash
npm ci
npm run dev:web
```

Open http://localhost:3000. Without a database URL, development shows a clearly
labelled sample workspace. Preview changes last until a full refresh.

To use real data, copy `.env.example` in this folder to `.env.local` and provide
`DATABASE_URL`, `SETUP_TOKEN`, and `APP_ORIGIN`. A Railway private hostname only
works inside Railway; local access requires an already-enabled public database
endpoint. Never put database credentials in `NEXT_PUBLIC_*` variables.

## What is included

Overview and daily reports, customer records and blouse measurements, multi-piece
orders, priority queues, per-piece station progress and corrections, QR labels
and camera/manual lookup, advances/balances, delivery, CSV export, owner sign-in,
worker accounts with station skills, manual/automatic assignment, and private
worker task queues. Live writes are validated and persisted in PostgreSQL;
preview data is never inserted into the live database.

The Team screen now creates worker accounts, manages availability and capacity,
and offers equal-piece or effort-based distribution. Workers see their own
prioritized work and can start, block, resume, and complete a stage. QR scanning
opens the exact piece for review. This team implementation is verified locally;
see [research, behavior, validation, and release notes](../docs/TEAM-WORKFLOW-IMPLEMENTATION.md).

Order intake uses one customer search with up to five name/phone matches.
Select a customer with one click, change the selection, or add a new customer
without leaving the form. The selected customer and order fields survive a failed
order save. Screen labels describe the task directly; workflow buttons name the
next station. Filters remain available while results load, save dialogs show their
progress, and timestamps display in the shop's Asia/Kolkata timezone.

See [the website handoff](../docs/WEBSITE.md) for the exact Railway resources,
deployment settings, persistence model, security boundaries, and remaining scope.

## Checks

```bash
npm run build -w web
npm run lint -w web
npm run typecheck -w web
npm run test -w web
```

Tests run against an isolated PostgreSQL WASM engine and do not touch Railway.

## Structure

Feature/service extraction, the Drizzle baseline, relational migration and paginated reads now
follow the local Dolce CRM reference. [ARCHITECTURE-ALIGNMENT.md](../docs/ARCHITECTURE-ALIGNMENT.md)
records completed work and the remaining event stage.

- `src/app/` — thin pages and protected API route composition.
- `src/features/<feature>/` — feature components, hooks, contracts, types, and pure rules.
- `src/services/` — server services, authentication, transaction orchestration and persistence.
- `src/db/` — bounded PostgreSQL pool, Drizzle schemas and versioned migrations.
- `src/integrations/storage/` — Railway S3 adapter.
- `src/shared/` — common UI, request guards, errors and formatting.
- `src/shared/compat/` — temporary workspace read/transport and sample-preview adapters.
- `tests/` — protected workflows, migration preservation and transitive client/server boundaries.

Feature commands use `/api/customers`, `/api/orders`, `/api/workflow`,
`/api/billing` and `/api/reports`. Authenticated GET routes supply paginated
screen records and server-computed totals. The browser uses `/api/session`
for login state and feature queries for records, with bounded search, focus
refresh and safe cancellation. Existing `/api/workspace` reads and writes
remain compatible for older clients. New saves request a small revision/result
receipt and refresh affected screens. There is no separate backend deployment.

Use `shahil` for development and `main` for verified Railway releases. These are
the project's only branches.

Migrations run transactionally on first server access. Version 1 baselines the
existing tables; version 2 adds a nullable retry fingerprint; version 3 adds
relational shop tables and storage-selection metadata. The ledger stores checksums
and rejects edits to applied migrations. Startup keeps JSON storage active.

`npm run db:relational -w web -- help` describes the operator CLI. It supports
read-only status, dry-run rehearsal, reconciled cutover and rollback that preserves
post-cutover work. Existing owner hashes, sessions, IDs, paise amounts and history
are preserved. Follow [RELATIONAL-MIGRATION.md](../docs/RELATIONAL-MIGRATION.md)
for full backup/live-data rehearsal requirements before switching production.

## Design

Warm white and sage surfaces, forest-green actions, serif page headings, and
Geist for interface text. Shared tokens live in `src/app/globals.css`. Layouts
adapt at 760px and 1060px, with additional narrow-phone refinements below 470px.
Dialogs use the browser's modal focus management; forms have native validation,
visible focus states, and touch-sized mobile controls.
