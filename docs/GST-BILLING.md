# GST settings and compact customer bills

The order page offers **View bill** to review the customer copy before using
**Print / Save PDF** for a compact A5 bill. The preview includes the shop branding,
customer and delivery details, payment status, garment charges, saved GST,
payment records, and balance. **Print order** retains the complete A4 workshop
details; QR labels remain a separate print action. A standard six-piece bill
with GST fits on one A5 page; longer orders continue without dropping items.

## Bill UI update — September 14 (deployed)

The responsive preview and print styles live in the billing feature. Preview
controls stay visible while the bill scrolls; closing the dialog restores focus
to **View bill**. Printing from the preview button or the browser uses the same
A5 customer copy. Bills distinguish unpaid, partially paid, fully paid, and
cancelled orders, without changing stored amounts or tax calculations.

Validated at 1440px, 390px, and 320px, including dialog focus and print actions.
PDF checks verified inclusive/exclusive GST amounts, a one-page six-piece A5
bill, and all 45 garments and 24 payments in a long-order fixture. Existing A4
order and QR printing were also checked. The GST and date-format tests,
TypeScript, ESLint, and production build passed. See
`output/qa/bill-ui-results.json` for browser and PDF results. This UI update has
been deployed as code `469195f9371f1bbf9bfc59140bead593fcfab59d` through
Railway deployment `7446035e-02f5-40d2-b168-3d2f16fe51cf`. All 49 tests passed
before release. Live health, protected API responses, pages and published assets
passed verification at `2026-09-14T07:43:16.201Z`. See
`output/qa/bill-history-production-release.json`. The production release below
describes the earlier GST version.

## GST behavior

**Settings → GST & billing** has an enable switch, GST percentage, prices that
include or exclude GST, and an optional shop GSTIN. GST starts disabled. New
orders capture these settings and the calculated tax amounts. Existing open
orders with an unpaid balance can use **Apply GST** under Payment details.
Saved GST is retained when the shop settings change; closed or settled orders
cannot receive a new tax charge.

All amounts use integer paise, with GST rounded once on the combined garment
amount. The shared billing domain feeds order intake, advance limits, payment
and delivery guards, billing queries, CSV exports, and the printed bill.
Migration 9 adds nullable GST columns to settings and orders, preserving legacy
amounts and the existing storage model. GST snapshots survive JSON rollback and
relational recutover.

## Validation

- 34 isolated tests passed, including tax rounding, inclusive/exclusive prices,
  stale settings, immutable bill amounts, payment limits, SQL billing balances,
  migrations, idempotency and storage rollback/recutover.
- TypeScript, ESLint, and the optimized Next.js production build passed.
- Browser checks passed for saving settings, mobile layout, applying GST to an
  existing unpaid order, six-piece intake, inclusive GST, and A5 printing.
- Printed sample bills were checked for page count, GSTIN, tax amount, total,
  paid amount, balance, and clipping.

## Production release

Released on 2026-09-13 from commit
`e69e12d2e7f58b49b527cdfadcb38339a1d46d6f` through the existing `main` Railway
deployment. Deployment `b9ab0942-01c7-4c46-aac3-98fa5f0ec896` is active and
successful at <https://swapna-garmentsweb-production.up.railway.app>.

Live health reports PostgreSQL and the private bucket connected. The session
endpoint completed schema initialization, including migration 9, and returned
the expected unauthenticated 401 with the existing owner setup intact. Settings
and order pages return 200; their deployed assets include GST settings, Print
bill, and the A5 print stylesheet. Verification did not change production shop
settings or customer orders. See `output/qa/gst-billing-release.json` for the
release check record.
