# Feature-driven architecture: alignment with Dolce CRM

## Decision and status

On 2026-09-12 the owner required Swapna Garments to follow the feature-driven
architecture used by their local Dolce CRM project. This document defines the
target for the active `web/` application. **Feature/service extraction, the
Drizzle baseline, and the relational migration are deployed to Railway.**
Full live database backups, isolated migration/rollback rehearsal and production
cutover passed on 2026-09-12. Paginated feature reads and durable events remain.
The relational migration has a tested
dry-run, reconciliation and rollback procedure in [RELATIONAL-MIGRATION.md](RELATIONAL-MIGRATION.md).
The live application uses commit `c19d928` and relational workspace revision 3.

Reference inspected: `C:/flutter_projects/dolce-crm`, especially `AGENTS.md`,
`apps/web/AGENTS.md`, the expenses route/service/feature, `src/db/index.ts`,
`src/db/schema/events.ts`, and `src/services/events/`.

Dolce's current application combines frontend and server APIs in Next.js. Its
feature folders contain UI and contracts; server services and domain schemas
live in separate, clearly named directories. This is the reference to match,
rather than introducing a separate Hono deployment or placing every layer
inside each feature directory. The older Hono five-layer design in
`ARCHITECTURE.md` remains historical reference for the unused backend baseline.

Keep the existing Railway PostgreSQL, bucket, responsive website, and owner
account. Architecture alignment does not require copying Dolce's credentials,
database, clinic-specific rules, Git branches, or historical Supabase settings.

## Target structure

```text
web/src/
  app/
    api/                       # thin REST handlers: auth, validation, service call
    orders/                    # thin page composition
    customers/
    ...
  features/
    auth/
    dashboard/
    customers/
    measurements/
    orders/
    workflow/
    billing/
    team/
    qr-tags/
    reports/
    settings/
      components/              # feature UI
      contracts/               # request/response schemas
      hooks/                   # fetching and local interaction state
      types/                   # client-safe types
      domain/                  # pure rules, also used by sample preview
  services/
    customer-service.ts        # authoritative business rules and persistence
    order-service.ts
    workflow-service.ts
    billing-service.ts
    report-service.ts
    events/                    # durable event recording and dispatch
  db/
    index.ts                   # bounded PostgreSQL client + Drizzle
    schema/                    # schemas split by business domain
  integrations/
    storage/                   # existing Railway S3 adapter
  shared/                      # auth guards, errors, logging, common UI/helpers
```

Each feature uses the components/contracts/hooks/types subfolders it needs;
empty placeholder folders are not required. Service modules can be split further
when their responsibilities grow.

Request flow: **feature UI -> API route -> service -> Drizzle/PostgreSQL**.
Pages and API routes compose these modules; they do not implement business rules.
Feature UI imports public contracts and shared UI, never server services or DB
modules. A server-side service is still necessary even though there is no
separate backend deployment.

## Current implementation and remaining changes

| Area | Current website | Target |
| --- | --- | --- |
| UI ownership | Screens now live in their own feature folders; commands use feature hooks/contracts/types | Completed for the current screens |
| Business logic | Pure rules belong to feature `domain/` modules; server services invoke them against locked database state | Completed extraction; relational persistence will replace the compatibility coordinator |
| APIs | Thin feature command routes call services; `/api/workspace` remains a compatibility read/write API | Resource-specific reads with filters and pagination remain |
| Data model | Drizzle domain tables are live; source checksum, owner and sessions were preserved through reconciled cutover | Complete for this migration; retain the documented backup/rollback procedure |
| List queries | Whole workspace is sent to the browser for filtering | Server-side filtering, stable sorting, pagination, and screen-specific summaries |
| Cross-feature side effects | Activity persists with shop state; relational mode records structured workflow history with each command | Durable domain events recorded with state changes, dispatched to idempotent consumers |
| Authentication | Shared guards and service-owned Drizzle authentication preserve password hashing and session cookies | Completed without resetting the owner account |

The existing activity list is not a durable event dispatcher. The existing
Hono in-memory event bus is also not used by the live Next.js website.

## Refactor order

1. **Feature and service extraction — implemented.** Work on an isolated refactor branch. Move
   screens into their owning feature folders and extract server SQL/transactions
   from route handlers into services. Retain the current HTTP contract and
   database representation as compatibility adapters. Keep the current behavior
   and responsive design. Do not replace the owner login during this step.
2. **Drizzle baseline — implemented.** Model the existing `sg_*` tables accurately, then
   introduce Drizzle and a versioned migration runner. Establish a migration
   baseline for the already-existing production schema so deployments do not
   recreate or drop tables. Keep explicitly labelled sample data isolated from
   live services.
3. **Relational data migration — deployed and verified.** Add customer, measurement-version, order,
   order-item, workflow-history, payment, report, and activity tables. Back up
   the live database and rehearse the migration on an isolated copy. Backfill
   existing JSON records while preserving IDs, integer-paise amounts, dates,
   history, idempotency records, and ownership. Compare records and totals and
   reject inconsistent data before switching reads/writes. Define a cutover
   and rollback procedure; do not allow two uncoordinated sources of truth.
4. **Feature APIs and hooks — commands implemented; reads pending.** Replace the compatibility workspace calls with
   resource-specific APIs and feature hooks. Add server-side search, filters,
   pagination, and dashboard aggregates. Preserve conflict detection and safe
   retry behavior across the transition.
5. **Durable events — pending.** Insert events such as `order.created`,
   `payment.recorded`, and `order.delivered` in the same transaction as their
   state changes. Add retryable dispatch and idempotent consumers. External
   messages must not be sent before the business transaction commits. Build
   actual notification providers only as separately scoped product work.

Complete and validate each step before production cutover. New shop features
must use the extracted boundaries; do not add domain rules to the compatibility
provider or coordinator.

## Completion checks

- Feature components cannot import the DB or server-only services.
- Routes authenticate and validate inputs, then delegate business work.
- Services enforce payment limits, station transitions, delivery eligibility,
  duplicate prevention, and authorization on the server.
- Schema migrations preserve the existing owner and all real shop records.
- Transactions keep state, history, and durable events consistent; retries do
  not duplicate orders or payments.
- Focused integration tests cover authentication, validation, conflicts,
  persistence, payment/delivery rules, and migration reconciliation.
- Type checking, lint, production build, and desktop/mobile workflow checks
  pass. Live database and storage health are checked after deployment.

## Implemented release: feature/service extraction and Drizzle baseline

Feature folders own the current screens, typed contracts, client hooks, and pure
rules. The former multi-feature `studio-pages.tsx` is split between workflow,
billing, team, QR lookup and settings. The shared provider now owns transport,
session state and compatibility snapshots; it contains no feature commands.

Feature writes use `/api/customers`, `/api/orders`, `/api/workflow`, `/api/billing`
and `/api/reports`. Shared route infrastructure checks origin, authenticates the
owner, bounds/parses the request and validates the feature contract. Services
own authentication and database transaction/persistence work. The transaction
coordinator locks the current workspace before invoking feature rules and records
the retry identity with the update. Preview uses the same pure rules locally.

`src/db/migrate.ts` applies versioned, checksum-checked migrations under the
existing PostgreSQL advisory lock. Version 1 baselines the existing schema;
version 2 adds a nullable command fingerprint. New retries with the same ID but
a different validated payload return 409. Older retry records remain compatible.
The owner, sessions and existing shop representation are retained. Rollback to
the previous app version does not require dropping the additive column or ledger.

Automated checks cover transitive client/server import boundaries, SQL-free
routes, existing-data migration preservation, authentication, feature endpoint
authorization/validation, retries, payment guards, workflow, delivery and reports.
The preservation test rehearses migration against an isolated PostgreSQL fixture;
it is not a backup or rehearsal of the live database for the future relational
cutover. No production database, owner account, bucket or Railway variables were
changed by this branch.

Validation for this release: `npm run build -w web`, `npm run typecheck -w web`,
`npm run lint -w web`, and all five `npm run test -w web` checks passed. Local
browser checks covered 1440px desktop and 390px mobile layouts, two-piece intake,
station advancement, payment recording and QR labels. The sample order total was
1,650 rupees; a 200-rupee advance and 450-rupee payment left 1,000 rupees due.
No horizontal overflow or browser console errors were observed in these checks.

## Implemented next stage: relational storage

Migration 3 creates normalized customer, measurement-version, order, order-item,
payment, staff, closed-day, report, activity and workflow-history tables. Normal
startup applies the additive schema and keeps JSON storage active. The operator
CLI handles read-only status, transactional rehearsal, reconciled cutover and
rollback using an expected revision/checksum and a verified external backup
reference. Each committed transition also saves an immutable workspace snapshot.

The same service transaction coordinates row writes, revision updates, retry
records and structured workflow history. Existing HTTP responses and owner
sessions remain compatible. Rollback materializes the current relational data,
including work created after cutover; it does not restore a stale pre-cutover
snapshot. Frozen JSON writes from an older application version are blocked.

This stage is tested on isolated PostgreSQL fixtures and a restored copy of the
live Railway database. Backup restore, migration and rollback reconciliation
passed. Production cutover and final checks passed as recorded in
[the operator runbook](RELATIONAL-MIGRATION.md). Resource-specific
pagination and durable event dispatch remain subsequent code stages.

Validation for the relational stage: all 10 automated tests, type checking,
lint, production build and operator CLI help passed. No UI changes were made
in this stage; the browser checks above belong to the extraction stage.
