# Shop calendar

Deployed on September 14, 2026, following the month-grid and selected-day
list in Dolce CRM's `ProfileCalendar.tsx`.

## Using the calendar

Open **Calendar** in the desktop sidebar or **More → Calendar** on mobile. The
date on Overview also opens it. Today is selected initially. Click a date, use
Previous/Next month, or jump directly to a date; Today returns to the current shop
date. Month navigation selects the first day of the new month so its details
always agree with the visible calendar.

Dates display record counts and category dots. The selected day shows summary
totals, category filters, and every matching record through 20-record pages.
Click any record to open its order. Changing the date or filter resets pagination.

| Category | Date used | Behavior |
| --- | --- | --- |
| Orders due | Scheduled delivery date | Includes completed orders; excludes cancelled orders. Open orders with past due dates are marked overdue. |
| New orders | Order creation timestamp | Includes cancelled orders for historical visibility. |
| Deliveries | Recorded delivery timestamp | Shows actual handovers on the selected date. |
| Payments | Payment timestamp | Shows each payment, its method and amount, including payments on cancelled orders. |
| Activity | Recorded activity timestamp | Shows order updates such as workflow movement and payment activity. |

Timestamp grouping and display use **Asia/Kolkata**. Date-only delivery dates
remain unchanged. Collected totals are calculated from payment records in integer
paise; activity entries do not add money again. An order may appear in several
categories, so the total is a record count rather than a count of distinct orders.
Statuses are current, not reconstructed historical snapshots. Activity includes
only events already retained by the existing application.

## Architecture

- UI, typed contracts, hooks and compatibility selectors live in
  `web/src/features/calendar/`.
- `GET /api/calendar?month=YYYY-MM` returns compact month/day aggregates.
- `GET /api/calendar/day?date=YYYY-MM-DD&kind=all&page=1&pageSize=20` returns
  daily totals and a bounded page of records. Supported category values are
  `all`, `due`, `created`, `delivered`, `payment`, and `activity`.
- Both routes require the authenticated owner, validate dates and query bounds,
  reject duplicate/unknown parameters, and return `Cache-Control: no-store`.
- `services/calendar-read-service.ts` uses the existing consistent-revision read
  transaction. PostgreSQL filters each source by date before combining,
  aggregating and paginating. The browser does not download the workspace or
  all monthly order details.
- Existing JSON storage and the sample preview share pure selectors. The live
  relational path does not read the frozen workspace JSON.
- No schema migration, new package, write endpoint, or production-data change is
  required. Shop-wide calendar access remains restricted by the owner-only guard.

## Worker calendar

The worker website adds **Calendar** to its bottom navigation at
`/my-work/calendar`. Worker visits to `/calendar` also open this personal view.
The month grid, date picker, Today control and selected-day layout are shared
with the owner calendar. Worker records have two categories:

- **Work due:** each currently assigned, unfinished piece on its order's delivery
  date, with its current custom workflow step and pending/in-progress/blocked
  status. Cancelled/delivered orders and ready pieces are excluded.
- **Completed:** each saved stage completed by the signed-in worker, grouped by
  completion time in Asia/Kolkata. These records remain after reassignment or
  delivery and open the existing immutable completion detail.

Daily totals include work due, completed stages, in-progress work and overdue
work. Selecting active work opens the exact piece in My work. Category/date
changes reset pagination; pages contain up to 20 records, due work first and
then newest completions. Counts describe records, so a piece may appear in both
categories when the same worker has completed one stage and owns the next.

The team feature owns worker UI/contracts/hooks and pure assignment selectors;
`services/work-calendar-service.ts` owns the authenticated read logic.
`GET /api/work/calendar?month=YYYY-MM` returns only aggregates, and
`GET /api/work/calendar/day?date=YYYY-MM-DD&kind=all&page=1&pageSize=20`
returns the selected day's bounded list (`all`, `due`, `completed`). Both use
the session's worker ID, reject scope overrides, exclude customer/financial
data and return no-store responses. SQL filters and paginates before returning
records. JSON rollback retains the immutable completion ledger. Sample preview
uses current assignments and has no persisted completion history.

`web/tests/work-calendar.test.ts` covers worker isolation (including same-name
workers), custom step labels, filtering, pagination across both sources, IST
midnight/month boundaries, reassignment, JSON/relational parity, rollback,
authentication, deactivated accounts and private-field exclusion. All 41 tests,
lint and TypeScript checks pass. Production build, browser checks and deployment
verification are pending for this worker extension.

## Validation

`web/tests/calendar.test.ts` exercises real PostgreSQL behavior using isolated
PGlite fixtures: JSON/relational parity, storage rollback, category totals,
cancelled-payment history, IST midnight/month boundaries, complete stable
pagination, leap dates, input validation, owner access, worker rejection, and
unauthenticated rejection.

Browser checks cover date selection, month changes, Today, category filters,
historical date entry, leap day, empty dates, order links, and mobile More-menu
navigation. Desktop and 390-pixel mobile layouts were visually inspected; mobile
had no horizontal overflow, and no browser warning/error logs were recorded.
Preview checks use sample data; database integration checks use isolated fixtures.

Final checks passed: `bun run build` (web and backend), `bun run lint`, the
web TypeScript check, and all 40 tests in `bun run test`.

## Production release

- Calendar code: `af42cda351ca57464fd43cf7c8d5bb0eb8e8c1f7`, published to `main` and `shahil`.
- Railway deployment: `f21081d2-bd21-4017-98c3-049d20404a14`, successful.
- Live calendar: https://swapna-garmentsweb-production.up.railway.app/calendar
- Verified at `2026-09-14T06:17:04.148Z`: health, Overview, Calendar and Orders
  returned HTTP 200; database and bucket reported connected. Both new calendar
  APIs returned HTTP 401 without a session and retained `Cache-Control: no-store`.
- All 11 calendar-page script assets loaded successfully; the new month/day query
  code was present in the deployed client bundle. Owner setup remained closed.
- The release was built and all 40 tests rerun in a clean checkout with the
  committed npm lockfile and the existing Railway build configuration.
- Production verification was read-only. No shop business records were changed.

Machine-readable checks: `output/qa/calendar-production-release.json`.
