# Scroll pagination

Deployed and verified on 2026-09-14.

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

## Production release

Code commit `116c0cd71441026ef2131b468574e6829c31bbc2` deployed successfully to
Railway as `2ecb7eb1-e944-4249-a543-ec9da6e65bed`. The release was validated in a
clean checkout with the existing npm lockfile and production build command;
the separate, pending Bun migration was not included.

Production HTTP checks confirmed healthy PostgreSQL and bucket connections,
working pages and assets, protected APIs, and closed owner registration.
The deployed JavaScript contains the scroll loader. Browser checks of the
deployed assets use intercepted synthetic API responses to verify scrolling
without creating or changing real shop records. See
`output/qa/scroll-pagination-production-release.json` for the release record.
