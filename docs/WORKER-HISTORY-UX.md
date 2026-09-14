# Worker history interface

The history list now groups finished stages by the shop calendar day. Today and
Yesterday show their full date beside the heading; older groups include the year.
Each compact entry shows the order, piece, garment, completed stage and time, with
a single tap target to open its saved details.

Search, station selection and pagination stay in the address so reload and detail
navigation preserve the current view. Clear search keeps input focus, clear
filters is always available while filtering, and manual refresh complements the
existing automatic refresh. Loading, empty and error states have recovery actions.
Pagination moves keyboard focus to the results and remains above the bottom nav.

## Verification

- Production build and full ESLint checks passed in an isolated checkout using
  the committed npm lockfile.
- All 38 web tests passed, including shop-midnight, year-boundary and leap-day
  grouping checks. Existing history authorization and immutable snapshots passed.
- `output/qa/history-ui-browser.cjs` passed against the final production build at
  320, 360, 390, 430, 768 and 1440px, with no browser errors. It verifies filters,
  pagination, detail return, reload, retry, empty/loading states, long text, input
  focus, minimum touch sizes and bottom-navigation clearance.
- Browser checks use synthetic, read-only API fixtures and an American device
  timezone to verify Indian shop dates. No live shop records were changed.
- Results: `output/qa/history-ui-results.json`. Phone and desktop screenshots are
  stored beside it as `history-ui-*.png`. The browser script defaults to local
  port 3118 and accepts `WORKER_TEST_URL` for another local production server.

The list has its own CSS module. Services, permissions, data contracts and saved
completion details are unchanged. Live deployment verification will be recorded
in `output/qa/history-ui-production-release.json`.
