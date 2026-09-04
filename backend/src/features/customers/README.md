# Customers (planned)

**Status:** scaffolded — built after the domain workshop.

## Purpose

Registry of the shop's customers: contact details (phone is the primary
identifier), measurement profiles, and full order history. Orders currently
carry a customer name/phone snapshot; once this feature lands they link to
a customer record via `Order.customerId`.

## Planned responsibilities

- Customer CRUD + lookup by phone (walk-in speed matters)
- Body measurement profiles per garment type (managed by the measurements
  feature, referenced here)
- Order history and repeat-order flow ("same as last time")

## Candidate events

- `customer.created`, `customer.updated`

## Open questions

See docs/DOMAIN-DISCUSSION.md §1.
