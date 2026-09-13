# Relational shop storage: migration and rollback

Status: **deployed and migrated in production on 2026-09-12**. Code commit
`c19d92851b49b3f152e863e4dba3e9949fdc4187` was deployed as
`a19a0fed-0db3-4568-b51b-0984f0a3e88c`. The live workspace now uses relational
storage at revision 3. Final verification completed at 16:27:45 UTC.

Both backups were restored to separate local PostgreSQL 18.6 databases. Migration,
rollback and recutover passed on the original restored copy; the fresh backup
also passed full-table reconciliation, migration and authenticated HTTP checks
using the production build before the live switch.

Verified backup (2026-09-12): `initial.dump`, SHA-256
`154be1e7ee12a0a7929d4fe6c2a8360dd7ec154bb1646e99932bd5d258b7c0de`.
The custom-format dump and separate role export are stored outside the
repository in the operator's private local application-data folder. All five
original tables matched their source row counts and full-row checksums after
restore, including the owner, five login sessions and mutation retry record.
The workspace has one customer, one staff entry and no orders/payments; its
canonical checksum remained identical through all rehearsed transitions.

A fresh post-deployment backup, `precutover.dump`, has SHA-256
`de0eb3a905acf8f570f83aa22c2a07f95894be5d1763ef0f12eb997a23aa3c92`.
All 17 tables in this backup matched after restore. The live migration snapshot
ID is `c95bdbf5-9ed3-45b4-b8f7-682b5bee65d2`. The source and final workspace
checksum is `7419c30a93cd5d4a2a5bec382b586ef80d24392a1736b8f0536a86fe5aa776bb`.

Backups and verification manifests are retained under
`%LOCALAPPDATA%/SwapnaGarments/migrations/20260912-213602/`. The portable bundle
`swapna-garments-before-migration-20260912.zip` contains the two dumps, separate
role exports and restore/checksum manifests. It contains private database data;
keep it outside source control. The temporary Railway SSH key was revoked, its
local key files removed, and the private tunnel and rehearsal server stopped.

Railway's built-in volume backup controls are restricted to Pro on this account.
This backup instead uses PostgreSQL 18.6 tools over a private SSH tunnel, without
exposing the database publicly. It is a point-in-time local backup; recurring
backups are not configured by this migration.

## What this release changes

Migration 3 adds Drizzle-backed customer, measurement-version, order, order-item,
payment, staff, closed-day, report, activity and workflow-history tables. Foreign
keys connect records, unique keys protect identities and order numbers, and
constraints protect station ranges and integer-paise amounts. Query indexes are
provided for subsequent feature-specific APIs.

The existing owner, salted password hashes, sessions and mutation retry records
stay in their original tables. No sample records are inserted. Startup applies
only additive schema changes and preserves the current storage model. A workspace
starts in JSON mode until explicitly migrated.
The storage switch is an explicit operator command, never an API route or a
startup side effect.

Existing screens continue using the compatible workspace API. Services read the
active model under the singleton workspace lock and persist to that model only.
In relational mode the JSON snapshot is frozen. A database trigger rejects old
application code attempting to overwrite it. API reads reconstruct the existing
response shape from relational records. Paginated feature reads are the next
architecture stage; this adapter still assembles the whole shop workspace.

## Data preservation and reconciliation

The switch retains IDs, array order, measurements and earlier measurement
versions, payment methods, paise amounts, report values, staff and activity.
Absent optional history/report arrays remain absent; empty arrays remain empty.
Timestamps are returned as UTC ISO strings representing the same instant, while
calendar dates remain unchanged. The original JSON, including its original
timestamp spelling, is retained in an immutable migration snapshot.
Nonzero sub-millisecond timestamp precision is rejected rather than truncated;
the current website writes timestamps at millisecond precision.

Before committing, the migration validates the complete source shape and rejects
unknown fields, duplicate IDs/phones/order numbers, missing references, invalid
dates, unsafe money totals and inconsistent ready/delivered orders. It compares:

- Physical row counts for every migrated domain, including measurement versions.
- Billed, collected and pending totals in integer paise.
- A SHA-256 checksum of the fully reconstructed, canonically formatted workspace.

Any failure rolls back the backfill, snapshot insert and storage switch together.
The revision and checksum supplied by the operator must still match the locked
source. A repeated switch to the already-active model makes no changes.

Migration snapshots in `sg_workspace_backups` are append-only and contain shop
data. They are not complete PostgreSQL backups: obtain and verify a full external
backup, including owner/session/retry tables, before changing production storage.
Treat both kinds of backups as private customer data; never commit them to Git.

## Workflow history

Existing free-text activity is retained intact. The old workspace did not record
structured per-piece transitions, so migration cannot reconstruct those events.
Each existing garment receives an explicitly labelled `baseline` observation at
cutover, with its current station and migration snapshot ID in the reason.

After cutover, order creation, station advancement and rework write structured
history with the business update and its mutation retry record in one database
transaction. Retries do not duplicate history. This is transactional history;
the durable event dispatcher remains a later architecture stage.

## Operator commands

Run from the repository root in an authorized environment that can reach the
intended PostgreSQL database. `DATABASE_URL` must already be supplied through
that environment. Railway's private `.railway.internal` address is reachable
inside its private network; this CLI does not expose a public database endpoint
or retrieve credentials from another project.

```text
npm run db:relational -w web -- help
npm run db:relational -w web -- status
npm run db:relational -w web -- check
```

`status` is read-only and also understands the original production schema.
`check` first ensures the additive schema migrations exist, then performs the
entire data backfill, reconciliation and switch in a transaction
that is deliberately rolled back. Its `revision` is the current source revision;
`projectedRevision` is what a committed switch would produce. The checksum and
counts describe the source. It prints no names, contact details or credentials.

Production procedure:

1. Verify this release on an isolated environment. Deploy the compatible code
   to all website instances while keeping JSON storage active. No variable is
   needed to force cutover.
2. Arrange a maintenance window with shop writes paused. Create a full verified
   database backup and record its identifier. Restore it to an isolated database.
3. On that restored copy, run `status`, `check`, and a real `cutover`; run the
   application checks and `check-rollback`. Compare IDs, counts and paise totals.
   A rehearsal on synthetic test data is not a substitute for this live-data
   rehearsal.
4. Confirm the live source revision and checksum still match the restored copy.
   Run the live switch using the exact rehearsal values and verified backup ID.
   Replace the uppercase placeholders in this example:

   ```text
   npm run db:relational -w web -- cutover --expected-revision REVISION --expected-checksum CHECKSUM --backup-reference BACKUP_ID
   ```

5. Verify `status` reports `relational`, reconcile the returned counts/totals,
   check authenticated workspace reads and owner sign-in, and check database and
   bucket health. Resume shop writes. Keep the external backup and migration
   snapshot according to the shop's backup retention policy.

The operator transaction waits at most five seconds for a lock and allows up to
120 seconds per migration query. All shop writes are serialized by the workspace
row lock during cutover; run the operation in the planned maintenance window.
Connection/schema errors abort safely and do not print SQL parameters.

## Rollback without losing subsequent work

Do not deploy the old application immediately after relational cutover: it reads
the frozen JSON snapshot and its snapshot writes are blocked. First use the new
release's rollback command to materialize the **current** relational workspace,
including every order, payment, measurement change and report since cutover.

Pause writes, obtain a new full backup, and rehearse on an isolated copy:

```text
npm run db:relational -w web -- check-rollback
npm run db:relational -w web -- rollback --expected-revision REVISION --expected-checksum CHECKSUM --backup-reference BACKUP_ID
```

Rollback stores another immutable snapshot, reconciles the current relational
rows, writes that current data to JSON, and changes the active model atomically.
It preserves the normalized rows and structured history as an archive. Verify
JSON status and current data before an older application version is deployed.

A subsequent rehearsed cutover can reconcile additional JSON-era work into the
existing relational rows. It refuses unexpected record removal, retains earlier
workflow history, and adds fresh baseline observations for the new cutover.
Never truncate target tables or drop schema migrations as a rollback shortcut.

## Local verification

Validation passed: all 10 automated tests, TypeScript checking, ESLint, and the
production Next.js build. The operator CLI help command also runs successfully.

PostgreSQL/PGlite integration tests cover populated and empty shops; offset
timestamps; absent/empty histories; report amounts above 32-bit integer range;
dry-run rollback; stale rehearsal checks; duplicate retries; physical-row
reconciliation; foreign keys and money constraints; owner/session preservation;
post-cutover mutations; forced transaction failure; rollback with subsequent
work; and recutover with retained history.

The live Railway network, both logical backups, full-table restore reconciliation,
live-data rehearsal and production cutover are verified. After cutover, server
workspace reads matched the source checksum; original owner, session, rate-limit
and mutation rows were unchanged. The immutable migration snapshot was verified.
Database/bucket health returned connected; six website pages returned HTTP 200;
all five feature command APIs required authentication; owner setup stayed closed.
Authenticated HTTP workspace reads passed on the isolated restored database.

## Catalogue and measurement extension (migration 4, deployed September 13)

The configurable intake release adds `sg_shop_settings`, `sg_garments`,
`sg_measurement_profiles`, piece measurement/history JSONB columns,
`sg_customers.has_profiles`, and `sg_domain_events`. Startup adds these structures;
it does not change the storage model. Existing records receive no invented size
values or historical measurement snapshots.

The release's reconciliation includes catalogue/profile rows and reconstructs all
piece and profile history. Its tests cover original schema upgrades, absent/empty
profile arrays, JSON intake followed by cutover, relational writes, rollback and
recutover. The new event ledger stays alongside retry records during transitions.

Use this release's operator tools for storage transitions after adopting the new
fields. Continue writes with a compatible application; older JSON writers may not
preserve fields they do not understand. The prior live cutover record above describes
migration 3. Migration 4 was released in code commit `43df3b0`, deployment
`ceb19c92-75ba-4466-a2db-07ed0c45f484`, on September 13. Live handlers completed
`ensureSchema` before returning the expected 401 responses for unsigned requests;
database/bucket health passed and owner setup remained closed. This additive
release did not switch the live storage model or create test shop records.

## Garment illustration extension (migration 5, deployed September 13)

Migration 5 adds a nullable `illustration_id` to `sg_garments`. It does not backfill
rows, change catalogue/workspace revisions, touch owner/session data, or change
the storage model. The service omits null image choices when reconstructing the
workspace, preserving the checksum of existing records. Choosing Automatic
clears an explicit image selection. New measurement snapshots also retain an
optional validated illustration ID in their existing JSONB storage.

The isolated tests upgrade a populated version 4 catalogue, verify migration
idempotency and unchanged data, and exercise saved image selection/clearing,
immutable order pictures, JSON rollback and relational recutover. Storage
transitions involving these properties require the updated validation/tools.

Released in code commit `574745b`, deployment
`a1961913-2716-4e24-86e1-cdfa63387de1`, verified at `2026-09-13T04:31:58Z`.
Live handlers completed schema initialization before returning their expected
unsigned-request responses; database/bucket health passed and owner setup
remained closed. No shop test records or storage-mode changes were made.

## Design library extension (migration 6)

Migration 6 adds nullable `image`, `reference_images` and `design_config` garment columns, a nullable `sg_order_items.design` snapshot, and `sg_design_assets`. Startup preserves existing values, revisions, owner/session records and the current storage mode. Null image fields are omitted when rebuilding existing workspace objects.

Current validation and reconciliation include image/configuration fields and immutable piece designs. The independent asset metadata/preferences table is retained through rollback and recutover. Full backups must include it and the private bucket; workspace JSON alone cannot restore uploaded images. Tests cover these transitions with custom photos, archived references and saved order snapshots. Use the updated tools for any future storage transition. See [feature details and release verification](DESIGN-LIBRARY-IMPLEMENTATION.md).

Released in code commit `775def5`, deployment `ce52aa64-f250-4eba-b01f-27e8052c50fd`, verified at `2026-09-13T06:19:48.144Z`. Live handlers initialized the schema successfully; owner setup stayed closed and database/bucket health passed. No storage-mode transition or production test records were needed.
