# Process Workflow (planned)

**Status:** scaffolded — built after the domain workshop.

## Purpose

The shop-floor pipeline: each garment piece moves through stations —
**cutting, sizing, handloom, stitching, ironing** — with repeatable steps
and correction/rework loops, until it is ready for delivery.

## Planned responsibilities

- Station model (ordered per garment/work type; some steps repeatable)
- Per-item progress tracking (each blouse piece, not just the order)
- Station check-in/check-out with employee + timestamp
- Correction loop: send an item back to any earlier station, with reason
- Station queues with the shop's prioritization rules (urgent first, then
  due date — to confirm)
- Drives the customer notification on every step (via events)

## Candidate events

- `order.process.started`, `order.process.completed`,
  `order.correction.requested`, `order.ready`

## Open questions

See docs/DOMAIN-DISCUSSION.md §2 and §3 — this feature has the most open
questions (per-item vs per-order tracking, station sequence, who may send
items back).
