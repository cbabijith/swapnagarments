# Billing (planned)

**Status:** scaffolded — built after the domain workshop.

## Purpose

From quotation at intake (rate card per garment/service/work) to advance
payment, balance collection, and the final invoice/bill for the customer.

## Planned responsibilities

- Rate card management (per garment type / service / complexity)
- Quotation on order creation; `Order.quotedAmountMinor` is reserved for it
- Payments: advance at intake, balance at delivery (integer minor
  units / paise everywhere — never floats)
- Invoice/bill generation and delivery (print / PDF / WhatsApp — workshop)
- Tax handling if applicable (GST — workshop)

## Candidate events

- `invoice.generated`, `payment.recorded`

## Open questions

See docs/DOMAIN-DISCUSSION.md §6.
