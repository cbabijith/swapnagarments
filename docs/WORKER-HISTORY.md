# Worker completed-work history

Deployed and verified on Railway, September 14, 2026.

A [details screen extension](WORKER-HISTORY-DETAILS.md) is deployed and verified
with immutable task snapshots and worker-scoped reference image access. Its
deployment status is tracked separately from the release below.

## Customer details — September 14 (local update)

History entries and their detail screens now show the customer's current name
and phone number. Phone numbers on the detail screen can be tapped to call.
Search also matches customer names and phone numbers, alongside order, garment
and stage. This update is implemented locally and has not been deployed.

Contacts are resolved from the order's current customer record for only the
authorized receipt or bounded history page. This also supports earlier receipts;
missing orders/customers show an unavailable message while retaining the work
record. Contact changes are reflected on subsequent reads; completed-stage
snapshots remain immutable. No migration is required, and both JSON and relational
storage modes use their active records.

The five targeted history/grouping/profile/calendar tests, ESLint, TypeScript,
and production build passed. Added assertions cover contact fields, worker
isolation, customer search and pagination, old receipts, contact edits across
rollback/recutover, and missing orders. Browser checks passed at 320px, 390px and
1440px for list/details layout, name/phone search, station filters, return
navigation, long names, missing contacts, and call links. See
`output/qa/history-customers-results.json`.

## Behavior

Workers can open **History** in the bottom navigation or **Work history** from
their current queue. Each entry shows the order number, garment, piece reference,
completed workflow stage and completion date/time in the shop timezone. Results
are newest first, with search, station filters and 20 entries per page.

History records completed stages rather than whole orders. It remains visible
after the next worker takes over, after delivery and when a piece returns for
correction. Completing the same station again creates another completion;
distinct custom workflow steps at the same station keep their original names.
Owner-confirmed advances of assigned pieces also credit their assigned worker.
Assignment, starting, blocking and requesting corrections do not create entries.

## Persistence and account boundaries

Migration 10 adds `sg_work_completions` and an index on worker/time. Immutable
receipts are written by the work-history service in the same transaction as the
command, its retry record and the workflow change. The stored assignee comes
from the state before the stage changes, so automatic assignment of the next
stage cannot change completion ownership. Retried commands return their original
receipt without adding another history entry.

The completion table is independent of the JSON/relational workspace selector,
like authentication and command records. It survives JSON rollback and recutover;
new commands record completions in either mode. Include it in full database
backups. No existing customer, order, payment, credential or workspace snapshot
is replaced by this migration.

The worker-only `/api/work/history` route authenticates before query validation.
Its service obtains the staff ID from the session and filters, counts, sorts and
pages records in PostgreSQL. Clients cannot request another worker's ID. The
local customer extension adds only customer name and phone; the list response
excludes customer email, measurements, notes, prices, payments, other assignees
and mutation IDs. A name change or another
worker sharing the same name does not change history ownership.

## Earlier completions

Previous relational workflow history stored the actor name, not their account ID.
Migration 10 recovers standard worker completion commands only when the original
SHA-256 command fingerprint matches an immutable staff ID and the completed
piece/station/version. Versions are bounded by the piece's current work version.
This also works when a worker has since changed their name. Recovery is
idempotent, and never treats a matching name alone as proof of ownership.

Older owner-only advances, events without a matching command fingerprint,
legacy activity without structured workflow history, or missing version/account
records cannot be attributed safely and are not invented. Their existing owner
activity/workflow records are preserved. Future owner-confirmed advances of
assigned work have explicit completion receipts.

## Validation

- All 35 web tests passed, including account isolation, recovery with renamed and
  identically named workers, retry deduplication, repeated custom-station steps,
  server filtering/pagination, correction and delivery, and JSON rollback/recutover.
- TypeScript, ESLint and the production Next.js build passed.
- A separate local PostgreSQL database and synthetic worker verified sign-in,
  stage completion, removal from the active queue, immediate appearance in history,
  search, station filtering, empty results and pagination across 24 completions.
- The worker history layout and navigation were inspected at 390px and 1440px.
  No browser console errors appeared. Production data was not modified.

## Production release

Commit `f68d8c7f32a9ef50c831943252f86ca727391eb9` is active through Railway
deployment `ffaa22c6-48c3-43a2-b7f5-030b217288af`, together with the worker
profile and personal work overview. Verification completed at
`2026-09-14T04:41:11.289Z` (10:11 IST).

All 36 tests, TypeScript, ESLint and the production build passed for the combined
release. The live My work, History and Profile pages return 200; all 10 worker
page script assets load and contain both features. Live APIs require sign-in,
authenticate before validating history filters, and return no-store headers.
The schema-initializing session/authentication checks passed, and database and
bucket health are connected. Existing owner setup remains closed.

No production business commands or worker sign-ins were submitted during release
verification. Authenticated completion/history flows were verified against the
isolated local database; no claim is made about the number of historical rows
recovered in production. The release report is
`output/qa/worker-portal-release.json`.
