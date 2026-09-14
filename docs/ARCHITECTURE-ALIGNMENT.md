# Feature-driven architecture: alignment with Dolce CRM

The shop calendar is implemented locally with feature-owned UI/contracts, thin
authenticated month/day APIs, and server-filtered aggregate/paginated reads.
See [calendar behavior and validation](CALENDAR.md). No database migration is
required; deployment is pending.

Worker completion history and personal profiles are deployed and verified. The
history feature UI, authenticated read service and additive migration 10 retain completed
stages by worker ID, independently of the active queue and storage selector.
See [behavior, earlier-record recovery and release validation](WORKER-HISTORY.md)
and [the worker profile implementation](WORKER-PROFILE.md).

GST settings and compact customer bills are implemented in the billing
and settings features. Shared billing domain calculations are used by intake and
server services; per-order tax snapshots keep payment balances, SQL billing reads,
exports and printing consistent. Migration 9 adds nullable GST columns and retains
legacy amounts. See [the GST release record](GST-BILLING.md) for verification.

Custom garment workflows extend the feature/domain/service split and preserve
the existing workstation-based team assignments. Migration 8 stores reusable
templates and immutable piece definitions. See [behavior and validation](CUSTOM-WORKFLOWS.md).

The deployed team/work implementation adds worker accounts, scoped task
queries, assignment rules, and exact-piece QR navigation through feature domain
modules and server services. Migration 7 is additive. See
[research, behavior, and validation](TEAM-WORKFLOW-IMPLEMENTATION.md). Code
`601a6fa` deployed successfully on September 13 through Railway deployment
`03b2d0e7-2ec8-4d50-9e0a-e1359ce237cf`; live health, pages, assets, and API
authentication checks passed. The historical release records below remain unchanged.

The garment/design image library now follows these boundaries in `features/design-library`, `services/design-library-service.ts`, and `integrations/storage`. Migration 6 is additive. See [implementation and validation](DESIGN-LIBRARY-IMPLEMENTATION.md).

## Decision and status

On 2026-09-12 the owner required Swapna Garments to follow the feature-driven
architecture used by their local Dolce CRM project. This document defines the
target for the active `web/` application. **Feature/service extraction, the
Drizzle baseline, and the relational migration are deployed to Railway.**
Full live database backups, isolated migration/rollback rehearsal and production
cutover passed on 2026-09-12. Paginated feature reads are deployed and verified;
durable events remain.
The relational migration has a tested
dry-run, reconciliation and rollback procedure in [RELATIONAL-MIGRATION.md](RELATIONAL-MIGRATION.md).
The relational cutover used commit `c19d928` and advanced the workspace to revision 3.
Subsequent shop commands continue advancing its revision.

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
| APIs | Authenticated feature GET/POST routes call services; `/api/workspace` remains for older clients | Feature reads and commands implemented |
| Data model | Drizzle domain tables are live; source checksum, owner and sessions were preserved through reconciled cutover | Complete for this migration; retain the documented backup/rollback procedure |
| List queries | PostgreSQL filters and pages records before hydration; dashboard and billing totals are computed across all records | Implemented for current screens |
| Cross-feature side effects | Activity persists with shop state; relational mode records structured workflow history with each command | Durable domain events recorded with state changes, dispatched to idempotent consumers |
| Authentication | Shared guards and service-owned Drizzle authentication preserve password hashing and session cookies | Completed without resetting the owner account |

The existing activity list is not a durable event dispatcher. The existing
Hono in-memory event bus is also not used by the live Next.js website.

## Refactor order

1. **Feature and service extraction — implemented.** Use `shahil` for development and `main` for verified releases, as requested by the owner. Move
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
4. **Feature APIs and hooks — deployed and verified.** Replace the compatibility workspace calls with
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
pagination is implemented below; durable event dispatch remains a subsequent code stage.

Validation for the relational stage: all 10 automated tests, type checking,
lint, production build and operator CLI help passed. No UI changes were made
in this stage; the browser checks above belong to the extraction stage.

## Implemented next stage: paginated feature reads

The live-mode browser now bootstraps through `/api/session` and requests only the
active screens' data. It does not automatically call `/api/workspace`. Feature
hooks own query parameters and preview selectors; shared transport handles
cancellation, errors, visible-tab polling, focus refresh and mutation invalidation.
Search changes reset list pagination, and background refresh preserves form input.
Shop dates refresh across midnight in Asia/Kolkata.

| Read | Behavior |
| --- | --- |
| Customers | Name/phone search, directory pages and total order counts; detail includes current measurements and paginated orders |
| Orders | Search, status/due/priority filters, stable pages, related customers; detail includes bounded activity |
| Dashboard | Full-shop counts and Kolkata-day payment/delivery totals, five priority tasks and three activity entries |
| Workflow | Independent station pages and full station counts; advancement uses the rendered expected station |
| Billing | Paginated filtered orders and full-shop pending/collected totals |
| Reports / team | Paginated saved reports and staff directory |
| Shell / search / QR | Open-order count, eight recent activities, six search results, direct code lookup |
| CSV export | Every matching order, independent of the visible page, with existing escaping and INR columns |

Lists default to 20 records and accept up to 50. Relational reads acquire a shared
workspace metadata lock for a consistent revision and filter/limit in PostgreSQL
before fetching nested records. Customer responses omit historical measurement
versions; saved history remains intact in storage. JSON storage retains a bounded
response adapter for rollback compatibility. No schema migration is added here.

Feature commands support `Prefer: return=minimal` and return only revision and
result ID to the new client. Older clients still receive their original snapshot
response. Idempotency, conflict checks, owner/session protection and transaction
rules are unchanged.

Validation: all 12 automated tests, lint, type checking and production build pass.
Tests cover multi-page fixtures, literal wildcard searches, all-shop aggregates,
Kolkata midnight boundaries, authenticated reads, input limits, CSV export and
JSON rollback behavior. Browser checks use a separate local PostgreSQL database
with 45 synthetic customers and 65 initial orders. Search, pagination, all-record
export, intake, station advancement and manual QR lookup pass. Eleven screens,
including intake and detail views, fit a 390px phone viewport; desktop checks use
1440px. No browser page errors or automatic workspace downloads were observed.

Remaining limits: the compatibility command coordinator still hydrates the shop
state on the server for authoritative rules. Nested items and payments are complete
for each selected order. CSV export hydrates in batches but builds the complete
file in memory while holding the read lock; large exports can delay writes.
These are distinct from the completed screen-query work. Durable event dispatch
and any new external notification providers remain future stages.

Railway release verified on 2026-09-12: code commit `27c7f30`, deployment
`fd9ec87c-c8a5-4826-af5c-3a7c6ccc752e`, status `SUCCESS`. Live health reports
PostgreSQL and bucket connected. All 13 feature list/detail/export read checks
reject unsigned requests with 401 and `Cache-Control: no-store`; owner setup
remains closed. The isolated browser and PostgreSQL test services were stopped
after validation. Both `main` and `shahil` contain the release.

## Deployed: configurable order intake

The September 13 implementation adds feature contracts and pure rules for shop
catalogues, customer garment profiles and atomic `order.intake`. Thin authenticated
`/api/settings` and `/api/measurements` routes use server services and the existing
locked transaction coordinator. The browser uses feature reads for catalogue and
selected-customer data; old client command routes remain compatible.

Migration 4 adds Drizzle schemas for settings, garments, customer measurement
profiles and durable command event identities, plus piece snapshots/history and a
profile-presence flag. Reconciliation and JSON rollback include these fields.
Order intake commits new customer, profile, expanded pieces, advance, retry receipt
and event identity together. No external event dispatcher or notification consumer
is introduced. Workflow reads include a bounded pending-measurement indicator.

New Order, customer profiles and Settings share the same dynamic measurement form.
Old orders keep their names, prices, units and measurement definitions. Settings can
archive garments, configure fields/presets/prices and set intake defaults. Pending
pieces cannot advance until measurements are confirmed. See
[implementation details and verification](ORDER-WORKFLOW-IMPLEMENTATION.md).
Railway deployment `ceb19c92-75ba-4466-a2db-07ed0c45f484` succeeded on September 13
for code commit `43df3b06f3122b01e9769f31ab5f22a7000f8fec`. Live database/bucket
health, seven page responses and new route authentication checks passed at
02:33 UTC. The deployed handlers completed schema initialization successfully;
existing owner setup remains closed. Verification did not add real shop records.
