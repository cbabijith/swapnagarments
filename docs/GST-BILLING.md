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

Production deployment verification is recorded after rollout.
