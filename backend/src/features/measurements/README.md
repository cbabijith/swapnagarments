# Measurements (planned)

**Status:** scaffolded — built after the domain workshop.

## Purpose

The heart of custom tailoring: record each customer's body measurements
per garment type (blouse, chudidar, …), store them safely, and reuse them
so repeat orders fit without re-measuring.

## Planned responsibilities

- Measurement field profiles per garment type (bust, waist, shoulder,
  sleeve, neck depth, … — exact fields are a workshop decision)
- Capture at order intake (sizing station) with per-order overrides
- Versioned measurement history (customers' sizes change over time)
- Feeds the order ticket printed/QR-linked for the shop floor

## Candidate events

- `measurement.recorded`, `measurement.updated`

## Open questions

See docs/DOMAIN-DISCUSSION.md §1.
