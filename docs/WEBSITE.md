# Responsive website — implementation and Railway handoff

The requested desktop and mobile website lives entirely in `web/`. It uses
Next.js for both rendering and protected server routes that access the existing
Railway PostgreSQL database. The existing `backend/` and `mobile/` projects are
unchanged and are not needed to run this version of the website.

## Implemented

- Responsive desktop sidebar and mobile bottom navigation; compact tablet sidebar.
- Owner overview with due/overdue orders, priority filters, per-station counts,
  payment totals, activity, and opening/closing views.
- Order search, status/priority filters, atomic customer/profile/order intake, garment notes,
  advance payments, order detail, and spreadsheet-safe CSV export.
- Customer directory, create/edit forms, separate garment measurement profiles,
  saved revisions, and per-piece snapshots in inches or centimetres.
- Configurable garments/services, prices, numeric/text/choice measurement fields,
  size presets and delivery defaults in Settings; pending sizes block piece advancement.
- Per-piece station progress, corrections with a reason, QR labels, camera QR
  scanning with manual order-code fallback, and order print layouts.
- Payment recording, balance validation, and delivery restricted to fully
  finished, fully paid orders.
- Saved daily reports and owner attribution on order activity.
- Owner account setup, sign-in, sign-out, hashed database sessions, and
  server-only PostgreSQL access.

## Preview versus live data

Local development without `DATABASE_URL` uses explicitly labelled sample data.
Preview mutations use the same validation rules as the server but stay only in
the current React session; a full refresh clears them. No seed data is ever sent
to PostgreSQL. `WORKSPACE_PREVIEW=true` explicitly enables this mode.

Production defaults to live mode and fails closed if the connection is missing.
It does not silently fall back to sample customers or an unauthenticated app.
With a database configured, the workspace is shown only after owner sign-in.
Successful changes are persisted before the UI displays success; refreshes happen
every 30 seconds while visible and when the window regains focus.

## Existing Railway resources

Latest release verified on September 13: code `43df3b0`, deployment
`ceb19c92-75ba-4466-a2db-07ed0c45f484`. Configurable intake and migration 4 are live.
Database/bucket health and protected feature routes passed. See the
[workflow release record](ORDER-WORKFLOW-IMPLEMENTATION.md#production-verification).

Verified through the owner's browser on 2026-09-12:

- Project: `lucid-surprise`, ID `a5c1e06b-847f-4242-8896-7c2056ceb6a7`.
- Environment: production, ID `88f679c9-2cac-431b-b3fe-8951112d0759`.
- Website: `@swapna-garments/web`, ID `01603962-f84e-4bb6-8b30-a483ca8e8842`.
- PostgreSQL: `Postgres`, ID `2a810b03-ae2c-487e-aa30-4772cb8ab42c`.
- GitHub source: `cbabijith/swapnagarments`, auto-deploying `main`.
- Source root is the repository root; watched path is `/web/**`.
- Existing build: `npm run build --workspace=@swapna-garments/web`.
- Existing start: `npm run start --workspace=@swapna-garments/web`.
- Bucket: `buffered-tin`, ID `1a7a0049-2647-4a21-abde-04a589ce9257`.
- Website: https://swapna-garmentsweb-production.up.railway.app

The website service now has reference variables for PostgreSQL and the existing
bucket. No database credentials or bucket secrets are stored in source code.
Live verification on 2026-09-12 returned HTTP 200 from `/api/health` with
`database: connected` and `bucket: connected`. The protected workspace endpoint
returned HTTP 401 with `setupRequired: false` and `setupAvailable: false` after
the owner created their account. The authenticated live dashboard was verified.
The temporary `SETUP_TOKEN` was removed from Railway and the local setup file
was deleted. Registration is closed; the owner now signs in with their email
and password.
The connected Railway MCP account cannot access this project; the user's Chrome
Railway session can. Deployment must use that authorized project context.

## Deployment settings

Keep the existing repository-root build/start commands. Set these variables on
the **website service**, not on PostgreSQL:

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
| `SETUP_TOKEN` | Omit after owner setup; needed only for a fresh installation |
| `APP_ORIGIN` | Exact HTTPS website origin after a domain is assigned, no trailing slash |
| `WORKSPACE_PREVIEW` | `false` |
| `AWS_ENDPOINT_URL` | `${{buffered-tin.ENDPOINT}}` |
| `AWS_S3_BUCKET_NAME` | `${{buffered-tin.BUCKET}}` |
| `AWS_DEFAULT_REGION` | `${{buffered-tin.REGION}}` |
| `AWS_ACCESS_KEY_ID` | `${{buffered-tin.ACCESS_KEY_ID}}` |
| `AWS_SECRET_ACCESS_KEY` | `${{buffered-tin.SECRET_ACCESS_KEY}}` |

Generate a setup code locally using `node -e
"console.log(require('node:crypto').randomBytes(32).toString('hex'))"`. Store it
only in Railway or ignored local environment files. The database password and
the setup code must never use `NEXT_PUBLIC_` environment variable names.

Use `/api/health` for the Railway health check. It returns 200 only when a real
database query succeeds and, when configured, a read-only S3 HeadBucket request
succeeds. The private database hostname is reachable from the
website service within this project; it is not reachable from a local computer.
No public exposure of PostgreSQL is needed for this deployment.

The server-only S3 client uses Railway's virtual-hosted bucket URLs. File upload
screens are not implemented yet; the bucket connection is ready for storage
features. Reference setup follows https://docs.railway.com/storage-buckets.

Create a public **website** domain, set `APP_ORIGIN` to that origin, and deploy
the reviewed source. On first visit, use the setup code to create the owner
account with an email and a password of at least 12 characters. The owner should
enter their own credentials. After setup, remove `SETUP_TOKEN`; setup is also
rejected once the owner record exists. Rotate the database credential that was
shared in the conversation through the PostgreSQL service's supported process.

Railway currently disallows opting new services into legacy Config as Code.
No new `railway.toml` is supplied; use the existing service settings.

## Persistence and request boundaries

On the architecture branch, `web/src/db/index.ts` maintains the bounded
PostgreSQL pool and Drizzle adapter. First access runs checksum-checked,
versioned migrations under a PostgreSQL advisory lock. The baseline retains
existing app-owned tables; the next migration adds a nullable command fingerprint.
Migration 3 adds relational domain tables and an explicit storage selector; it
does not automatically switch shop data. Operator rehearsal, cutover and rollback
are documented in [RELATIONAL-MIGRATION.md](RELATIONAL-MIGRATION.md).
This does not drop, rename or seed other tables. See
[the architecture status](ARCHITECTURE-ALIGNMENT.md) for rollout status.

Until cutover, `sg_workspace` contains the active JSONB snapshot for this single
shop. After cutover, services read/write relational domain tables and preserve
the frozen JSON snapshot. A workspace row lock serializes mutations; clients send
commands rather than full snapshots. `sg_mutations` records command IDs so an ambiguous retry cannot record
a second payment or order. Expected station numbers reject stale workflow steps.
New retry records also reject reuse of one command ID for different input.
This is a small-shop starting model, not a multi-tenant or high-volume schema.

`sg_owner` stores a salted scrypt password hash. Session cookies are HttpOnly,
SameSite=Lax, and Secure in production; only token hashes are stored in
`sg_sessions`, with a seven-day expiry. Every data request authenticates on the
server. Mutations check the request origin and validate with Zod. Authentication
attempts are rate-limited in PostgreSQL across instances. SQL values are bound
parameters; database errors and credentials are not returned to the browser.

## Validation and remaining scope

`npm run test -w web` runs isolated tests against PostgreSQL's PGlite WASM engine
and the real route handlers. Coverage includes setup-code checks, authentication,
origin checks, data persistence, monetary guards, multi-step workflow, stale
updates, idempotent retries, delivery, reports, and session revocation. Architecture
checks cover client/server boundaries and thin routes; migration checks retain
existing owner/session and shop records on an isolated fixture. This is
not a test of the live Railway network connection.

Build, lint, and TypeScript checks run in the web workspace. Browser checks cover
desktop/mobile layouts, multi-piece intake, QR labels, and payments.

Still outside this version: separate employee logins/permissions, staff management,
real WhatsApp/email delivery, rate-card management, tax invoices, offline writes,
and an installable service worker. The team page is a directory; it is not a
permissions editor. Garment names, optional default prices, numeric/text/choice
measurement templates and size presets are configurable in Settings. Customers
have separate garment profiles and orders retain each piece's saved measurements;
see [the intake and settings guide](ORDER-WORKFLOW-IMPLEMENTATION.md).
Camera scanning needs HTTPS (or localhost), camera permission, and a real camera;
the manual fallback remains available.
