# Orders screen

The Orders list now keeps its primary action in a floating **New order** button,
above the bottom navigation on phones. The page reserves enough scroll space for
the final order to clear the button. **All**, **Urgent**, **High**, and **Normal**
chips replace the priority dropdown, expose their selected state to assistive
technology, and work with the existing status filter and debounced search.

The compact heading gives more space to the list. Result counts, a clear-search
button, and a reset action make filtering easier to understand. Mobile cards show
the customer, order number, garment, status, priority, delivery date, and outstanding
balance. Empty results provide a reset action. The shared header also fits 320px
screens without horizontal overflow.

Feature styles are scoped to `orders-list.module.css`. The existing paginated
reads, exports, services, authorization and persistence are preserved; no database
migration is required.

## Verification

- Clean detached checkout of `749836dfc9f8de7b8c25811e267a007f3cce2cab` installed
  with `bun install --frozen-lockfile`.
- Production build, TypeScript, full ESLint and all 49 web tests passed.
- Browser checks passed at 320, 360, 390, 430, 760, 768 and 1440px.
- Checked combined search/status/priority filters, all four priority chips, reset,
  clear search, empty results, filtered CSV export, keyboard activation, order
  detail navigation, and the floating button's link to the New order screen.
- Verified stable filter layout, touch targets, mobile navigation clearance and
  scrolling the final record above the floating button. No browser errors.
- Local browser evidence: `output/qa/orders-ui-results.json`.

## Release

Code `749836dfc9f8de7b8c25811e267a007f3cce2cab` was pushed to `main` and `shahil`
on September 14, 2026. Railway deployment
`2f85124a-35ec-4aa1-b338-67bc3c020bcb` is active and successful. Production was
verified at **15:56 IST**:

- `/orders` and `/orders/new` return 200.
- All 17 published assets load and contain the floating action, priority chips,
  compact heading, filter reset, clear-search control and mobile balances.
- Database and image storage are connected. Unsigned order/export APIs return
  401 with `no-store`, and owner setup remains closed.
- Verification submitted no production business commands.
- Release evidence: `output/qa/orders-ui-production-release.json`.
