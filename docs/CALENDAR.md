# Shop calendar

Implemented locally on September 14, 2026, following the month-grid and selected-day
list in Dolce CRM's `ProfileCalendar.tsx`. This feature has not been deployed.

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
  required. Worker access remains restricted by the existing owner-only guard.

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
