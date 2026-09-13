# GST settings and compact customer bills

The order page offers **Print bill** for a compact A5 customer bill and **Print
order** for the complete A4 workshop details. QR labels remain a separate print
action. A six-piece bill with GST fits on one A5 page; longer orders continue
without dropping items.

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
