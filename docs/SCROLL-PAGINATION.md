# Scroll pagination

Implemented locally on 2026-09-14; deployment is not part of this change.

## Behavior

The previous/next controls have been replaced with automatic loading near the
bottom of each list. New records append to the existing records. The footer
shows how many records are loaded and indicates when the list is complete.
A keyboard-accessible **Load more** button also works when IntersectionObserver
is unavailable. Errors preserve the visible records and provide **Try again**.

This covers Orders, order activity, Customers, customer orders, Billing,
Workflow station columns, Team, assignment dialogs, work queues, completed work
history, shop and worker calendar day entries, daily reports and garment settings.
Search, date, selected-record and filter changes start fresh lists. Work history
retains its URL page depth for returning from a completed-stage detail and no
longer scrolls to the top when loading more entries.

## Implementation

- Feature hooks use `useInfiniteFeatureQuery` and feature-specific page adapters.
  The shared transport appends bounded requests; the existing server-side
  filtering, sorting, totals, authorization and page-size limits are retained.
- Loaded records remain visible while a new page or refresh is pending. Duplicate
  records are merged by stable IDs, and overlapping observer events cannot queue
  concurrent appends. Filter changes/unmounting cancel outstanding reads.
- Mutations, focus and the existing visible-tab refresh rebuild the loaded pages.
  Pages from different workspace revisions are never combined: changed offset
  boundaries trigger a bounded restart, preserving the old display on failure.
  Only already-requested pages are refreshed, not the entire shop dataset.
- Garment settings already receive a bounded catalogue of at most 50 garments;
  scrolling increases its local display slice. Other lists continue to request
  API pages (normally 20 records; reports use 10).
- No new dependencies, API changes or database migrations are required.

## Verification

- Automated regression tests cover appending, empty/partial final pages, refresh
  after removals, revision changes, bounded retries, failed requests, query
  identities and duplicate merging.
- The full test suite, ESLint, TypeScript and production build pass.
- `output/qa/scroll-pagination-browser.cjs` checks the UI against synthetic,
  intercepted API responses on a separate local server. It verifies desktop and
  mobile scrolling, retained records and metadata, search resets, stale-response
  cancellation, retries, refreshes and termination. These checks do not change
  shop records or access the production database.
- Results and a mobile screenshot are saved under `output/qa/scroll-pagination-*`.
