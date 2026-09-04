# QR Tags (planned)

**Status:** scaffolded — built after the domain workshop.

## Purpose

A printed QR code on every cloth piece so any employee can scan it at their
station and immediately see what the item is, where it is in the pipeline,
and what happens next.

## Planned responsibilities

- QR/label generation at intake (per piece — to confirm) containing a
  signed item reference
- Printable label layout (thermal printer? A4? — workshop decision)
- Scan resolution endpoint: item identity + current station + next step +
  history
- Reprint flow for damaged labels

## Candidate events

- `qr.tag.printed`, `qr.tag.scanned`

## Open questions

See docs/DOMAIN-DISCUSSION.md §5.
