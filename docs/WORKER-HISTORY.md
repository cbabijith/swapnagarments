# Worker completed-work history

Implemented locally on `shahil`, September 14, 2026. Awaiting deployment.

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
response excludes customer identity/contact details, measurements, notes,
prices, payments, other assignees and mutation IDs. A name change or another
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
