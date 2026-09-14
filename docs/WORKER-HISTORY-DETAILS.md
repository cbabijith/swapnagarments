# Worker history details

Implemented locally on `shahil`, September 14, 2026. This extension has not been
deployed; the earlier History list and Profile release remains unchanged.

Workers can open **View details** on a history entry, or select a recent
completion on their profile. `/my-work/history/[id]` shows the garment, complete
piece code, order number, completed stage, workstation and completion time.
History remains selected in the worker navigation. **Back to history** restores
the previous search, station filter and page.

New completions also show saved material/design notes, measurements with their
units, reference images, original due date and priority, and assignment/start
timestamps when available. Images open in a larger read-only dialog. These are
snapshots of the completed stage; later edits, reassignment, correction, delivery
or customer measurement updates cannot change this record. Text and selection
measurement fields are displayed without a numeric unit suffix.

Earlier receipts still open a details screen. They show their existing completion
record and an explicit explanation that detailed snapshots were not recorded.
Current garment data is not backfilled into older history.

## Architecture and access

- Migration **11** adds one nullable JSONB snapshot column to the existing
  completion table. It changes no previous migration and leaves older rows null.
- The completion service saves a limited task snapshot in the same transaction
  as the stage transition and retry receipt. It excludes customer contacts,
  order notes, billing, account IDs, credentials and measurement recorder names.
- `/api/work/history/[id]` authenticates and validates the UUID before calling
  the feature service. The service selects by both receipt ID and session worker
  ID. Missing and other-worker receipts return the same 404 response. Owner
  sessions cannot use this worker-only endpoint; unsigned reads return 401.
- Private image requests accept `work=history:<completion-id>`. The service
  verifies the worker owns the receipt and that the requested image is referenced
  in its snapshot before reading storage. Archived library uploads remain retained
  under the existing immutable image storage policy.
- History list queries stay paginated and omit snapshots. Detail queries fetch
  one receipt. JSON rollback and relational recutover retain receipt snapshots.

## Verification

- All 36 web tests pass, including detailed receipt immutability after edits,
  reassignment and delivery, authorized historical image reads, rejected reads
  for other workers/unrelated images, missing/invalid IDs, limited response fields,
  older receipt recovery and storage rollback/recutover.
- TypeScript, ESLint and the production Next.js build pass.
- A separate local PostgreSQL database with synthetic accounts verified worker
  sign-in, filtered-list navigation to details and back, profile-to-details links,
  old completion fallback, saved measurements, and enlarged reference images.
- Desktop (1440px) and phone (390px/320px) checks found no horizontal overflow.
  Reference images loaded and no browser console errors appeared. These checks
  accessed no production worker account or customer records.
