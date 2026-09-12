# Domain Workshop — Agenda & Open Questions

This file is the agenda for the discussion phase **before** building the
business features. The project foundation (architecture, event-driven core,
orders + notifications reference flow) is already live.

> **North star (owner's words, 2026-09-12):** "When the owner opens or
> closes the shop, they want to know what is highest priority, what must be
> done today, how much got finished today — life made easy and
> accountable." Every module should serve this daily open/close ritual.
> It is specified as Milestone 15 in docs/BACKLOG.md (#64–#69).

> Legend: ⚠ = blocking decision for the next build phase.

## 1. Customers & measurements

Customers bring garments (often their own cloth/material) for customization.
At intake the shop records body measurements, stores them, and reuses them
so repeat orders fit without re-measuring.

- [ ] Which measurement fields per garment? (blouse: bust, waist, hip,
      shoulder, sleeve length, neck depth, blouse length, side/loose
      preference, others? chudidar/gown/skirt profiles?)
- [ ] Units — inches only, or inches + cm?
- [ ] Do measurements belong to the **customer** (body profile) with per-order
      overrides, or only to each order?
- [ ] Should intake capture "cloth/material handed over by customer" as a
      tracked item (type, quantity, color, returnable?) — likely yes.
- [ ] Any standard sizes (S/M/L/XL) alongside custom measurements?

## 2. Order intake & prioritization

- [ ] One order = multiple garments; is priority per order or per item? ⚠
- [ ] Rush handling: what makes an order `urgent`, and how should the queue
      order work (due date vs priority vs both — e.g. urgent first, then
      earliest due date)?
- [ ] Delivery date: chosen freely by staff, or suggested from workload
      (open items per station)?
- [ ] Corrections after delivery: new order, or reopen the same order? ⚠

## 3. Shop-floor workflow

Stations mentioned: **cutting, sizing, handloom, stitching, ironing** —
repeatable steps, plus modify/correction loops.

- [ ] Confirm the station list and whether the sequence is fixed or depends
      on garment/work type. ⚠
- [ ] Is progress tracked **per item** (each blouse piece) or per order? ⚠
- [ ] Which steps can repeat (e.g. ironing after correction), and who may
      send an item back to a previous station?
- [ ] Should each step record employee + timestamps (audit trail)?
- [ ] Are there hand-offs to outside workers (e.g. handloom at another
      location)?

## 4. Employees

- [ ] Roles (owner, counter staff, master tailor, cutting, ironing, …) and
      what each may see/do. ⚠
- [ ] Are tasks assigned by the owner, or pulled by employees from a
      station queue?
- [ ] Do we need per-employee productivity views (items completed/day)?

## 5. QR tags

- [ ] One QR per **piece** (each blouse) vs per **order** — per piece seems
      implied ("on each clothes"); confirm. ⚠
- [ ] What should scanning show — item status page, next station, history?
- [ ] Label format & printer (thermal 40mm? A4 sheet?), and who prints
      (counter at intake?).
- [ ] Which devices scan at stations — shop phone camera, tablet, USB
      scanner?

## 6. Billing & payments

- [ ] Pricing model: fixed rate card per garment/service/work? Who edits
      it?
- [ ] Advance payment at intake + balance at delivery? Record payments
      against orders? ⚠
- [ ] Taxes (GST?) on invoices, or plain bills?
- [ ] Invoice format: print (58mm/80mm/A4) or PDF/WhatsApp?
- [ ] Charges for corrections/rework — billable?

## 7. Notifications (email + WhatsApp)

Every process step should notify the customer.

- [ ] WhatsApp provider — options: Meta WhatsApp Cloud API (needs business
      verification), Twilio, Gupshup, MSG91, Interakt… which is feasible? ⚠
- [ ] Email — existing shop email over SMTP (e.g. Gmail app password) is
      enough?
- [ ] Template language(s): English, Malayalam, both?
- [ ] Exact trigger points (order received, each station completion,
      ready, delivered, corrections?) — and should station-level updates be
      grouped to avoid spamming the customer?
- [ ] Opt-out / quiet hours?

## 8. Platform & operations

- [ ] Where does it run — cloud (always on, backups) or a shop PC?
      Recommendation: cloud + daily backups. ⚠
- [ ] Database: PostgreSQL recommended (measurement history, audit,
      reporting). Confirm.
- [ ] Staff accounts & login from day one? (Recommendation: yes, before
      shop-floor screens.) ⚠
- [ ] Devices used daily: desktop at counter, phone/tablet at stations?
- [ ] UI language: English only or bilingual?
- [ ] Data retention: keep delivered orders forever (measurement reuse) —
      confirm.

## 9. Build order (proposal — to confirm after discussion)

1. Database + persistence + auth (staff accounts)
2. Customers + measurements (with measurement profiles)
3. Process workflow per item + employees + station queues
4. QR tag generation + printing + scanning flow
5. Billing & payments
6. Real email/WhatsApp providers

## Decision log

| Date       | Decision                                                       |
| ---------- | -------------------------------------------------------------- |
| 2026-09-04 | Next.js 16.3.4 + TypeScript (App Router, src/ layout)          |
| 2026-09-04 | TypeScript 7.0.2 verified for builds, but typescript-eslint   |
|            | hard-blocks TS 7 — pinned 5.9.x until linter support lands    |
|            | (one-line version bump in package.json when it does)          |
| 2026-09-04 | Feature-driven vertical slices + 5-layer architecture          |
| 2026-09-04 | Event-driven APIs via EventBus port (in-memory impl for now)   |
| 2026-09-04 | Money stored as integer minor units (paise)                    |
| 2026-09-04 | Orders reference feature + notifications subscribers live      |
| 2026-09-04 | Monorepo: web/ (Next.js) + backend/ (Hono) + mobile/ (Flutter) |
| 2026-09-04 | Hono 4.13 backend owns all APIs; Next.js is UI-only            |
| 2026-09-04 | Better Auth 1.7 for staff auth (email+password, sessions);     |
|            | SQLite/Drizzle persistence for auth; orders still in-memory    |
|            | until the domain DB decision                                   |
| 2026-09-04 | `/api/v1/*` protected by session middleware; auth changes      |
|            | publish events (`auth.user.created`)                          |
| 2026-09-04 | Flutter 3.44 stable for mobile (station scanning focus)        |
| 2026-09-12 | North star captured: owner's daily open/close ritual is the   |
|            | product's core — specified as Backlog Milestone 15 (#64–#69)  |
