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
completion details are unchanged.

## Deployment

Deployed and verified on 2026-09-14 at
https://swapna-garmentsweb-production.up.railway.app/my-work/history.
Release commit `ffc860ed6afcbfb68a51eb725633b4e4eedf4d16` runs as Railway deployment
`1f6237b9-e0c0-4e96-a448-f4acb54c944a`. The build and deployment succeeded. Live
health reports the database and image bucket connected; worker pages return 200,
protected APIs return 401, and all 14 referenced assets load with the new history
grouping, refresh and filter-reset controls. Owner setup remains closed.
The read-only verification is in `output/qa/history-ui-production-release.json`.
