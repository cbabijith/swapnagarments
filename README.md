# Swapna Garments — Tailoring Management System

Complete management software for the **Swapna Garments** custom tailoring
shop (ladies' blouses and other garments): customer measurements, order
intake, shop-floor workflow with QR-tagged pieces (cutting → sizing →
handloom → stitching → ironing, with repeatable steps and corrections),
billing, and automatic customer notifications (WhatsApp + email) on every
step.

Built as a monorepo: a **Hono backend** (Better Auth, Zod, event-driven),
a **Next.js web app** (mobile-responsive **PWA** with bottom navbar +
**admin panel** with sidebar — in development), and a **Flutter mobile**
project (on hold; the PWA is the mobile experience for now).

| | |
| --- | --- |
| Repository | `github.com/cbabijith/swapnagarments` (branch `main`) |
| Status | **Foundation complete & verified** — business features in planned backlog |
| Next phase | PWA + admin panel per [docs/BACKLOG.md](docs/BACKLOG.md) (63 issues) |

---

## Table of contents

1. [The business flow](#the-business-flow)
2. [Users & roles](#users--roles)
3. [Modules](#modules)
4. [Features](#features)
5. [Tech stack](#tech-stack)
6. [Architecture](#architecture)
7. [Repository structure](#repository-structure)
8. [Getting started](#getting-started)
9. [Configuration reference](#configuration-reference)
10. [API reference](#api-reference)
11. [Events](#events)
12. [Development workflow](#development-workflow)
13. [Roadmap](#roadmap)
14. [Known limitations](#known-limitations)
15. [Documentation index](#documentation-index)

---

## The business flow

What the software models, end to end:

```
 Customer arrives (often with own cloth/material)
        │
        ▼
 [1] INTAKE — find/create customer → record MEASUREMENTS (stored for reuse)
        │          choose items & quantities → due date + priority → quote
        ▼
 [2] ORDER created  ──▶ QR LABEL printed for every cloth piece
        │                      (customer notified: order received)
        ▼
 [3] SHOP FLOOR — the piece moves station to station by scanning its QR:
        cutting → sizing → handloom → stitching → ironing
        │          (customer notified at each step; steps can repeat;
        ▼           corrections send a piece back to any earlier station)
 [4] READY  ──▶ balance payment collected ──▶ INVOICE printed
        │                      (customer notified: ready / delivered)
        ▼
 [5] DELIVERED — materials returned, order closed, sizes saved for next time
```

Everything that happens along the way is a **domain event**
(`order.created`, `order.process.completed`, …) — notifications, billing
and future features react to events instead of being wired into each other.

## Users & roles

| User | Where | What they do |
| ---- | ----- | ------------ |
| **Shop owner** (admin) | Admin panel (desktop) | Sees everything: dashboards, all orders, workflow board, billing & payments, rate card, staff & roles, event/audit viewer. Makes the pricing and priority decisions. |
| **Counter staff** | PWA / admin panel | Day-one intake: find/create customers, take measurements, build orders, quote & collect advance, print QR labels and bills, mark deliveries. |
| **Station workers** (cutting master, sizing, handloom operator, tailor, ironer) | PWA on a phone | Scan a piece's QR to check it in/out of their station, work their priority-sorted queue, send pieces back for corrections with a reason. |
| **Customer** (external) | WhatsApp / email | Receives automatic updates on every step: order received, work started, each station completed, corrections, ready for pickup, delivered. No login needed. |

> Role enforcement (owner vs counter vs station staff) is a planned backlog
> item — today every signed-in user can access everything (see
> [Known limitations](#known-limitations)).

## Modules

**Backend (9 modules — each a vertical slice in `backend/src/features/`):**

| # | Module | Purpose | Status |
| - | ------ | ------- | ------ |
| 1 | **auth** | Staff accounts: Better Auth email+password, sessions, SQLite/Drizzle, `auth.user.created` event | ✅ Live |
| 2 | **orders** | Multi-item orders, guarded status lifecycle, priority, due dates | ✅ v1 live (edit/cancel/queue planned) |
| 3 | **notifications** | Event subscribers → WhatsApp + email (console adapters until providers chosen) | ✅ Wired |
| 4 | **customers** | Registry, phone lookup, order history, measurement profiles | ⬜ Backlog #26–29 |
| 5 | **measurements** | Per-garment measurement profiles, versioned history, reuse on repeat orders | ⬜ Backlog #30–31 |
| 6 | **process-workflow** | Stations, per-item check-in/out, corrections/rework loops, queues | ⬜ Backlog #40–42 |
| 7 | **qr-tags** | QR generation per piece, signed scan resolution, labels | ⬜ Backlog #39 |
| 8 | **billing** | Rate card, quotations, advance/balance payments, invoices | ⬜ Backlog #49–54 |
| 9 | **employees/roles** | Staff management, roles, permissions | ⬜ Backlog #55–57 |

**Web (2 experiences, one Next.js app):**

| Experience | Navigation | Purpose | Status |
| ---------- | ---------- | ------- | ------ |
| **PWA** `(pwa)` | Bottom navbar: Home · Orders · **Scan** (center) · Stations · More | Installable, offline-tolerant phone app for counter + shop floor | ⬜ Backlog M4, M5, M7, M10 |
| **Admin panel** `(admin)` | Sidebar: Dashboard · Orders · Customers · Workflow · Billing · Staff · Settings | Desktop command center for the owner | ⬜ Backlog M3, M6, M11–M13 |

**Mobile:** `mobile/` Flutter 3.44 project exists as a placeholder; the PWA
is the mobile story for now (kept for future native needs).

## Features

**Working today (verified by live smoke test):**

- Staff sign-up / sign-in / sign-out with session cookies (Better Auth)
- All `/api/v1/*` endpoints require authentication (401 envelope otherwise)
- Create multi-item orders (garment types, quantities, notes, priority,
  due date) with domain validation (no past due dates, quantity limits…)
- Guarded status lifecycle: `received → in_progress → ready → delivered`,
  `cancelled`, plus `ready → in_progress` for rework — illegal jumps are
  rejected with a 422 explaining allowed transitions
- Event-driven core: every change publishes events with **actor
  attribution** (which staff user did it); a live event feed endpoint
- Customer notifications on order events (email + WhatsApp — currently
  logged by dev adapters)
- Uniform JSON response envelope + typed error codes across the API
- Health endpoint; structured JSON logging

**Planned (full list with details in [docs/BACKLOG.md](docs/BACKLOG.md)):**

- Customer registry with measurement profiles & versioned sizes
- Full intake flow with quotation + printable QR labels per piece
- Station workflow: scan check-in/out, priority queues, correction loops
- Billing: rate card, advance/balance, invoices (print/PDF)
- Roles & permissions; real WhatsApp (Cloud API) + SMTP email providers
- PWA: installable, offline shell, install prompt, mobile UX polish
- Admin panel: dashboard, orders/customers tables, workflow board,
  staff & settings, event viewer
- E2E smoke test (Playwright), Lighthouse & accessibility passes

## Tech stack

| Piece | Choice |
| ----- | ------ |
| Web | Next.js 16.3.4 (App Router, Turbopack), Tailwind CSS v4, TypeScript strict |
| Backend | Hono 4.13 on `@hono/node-server`, port 3001 |
| Auth | Better Auth 1.7 (email + password, cookie/bearer sessions) |
| Validation | Zod 4 (`@hono/zod-validator` at the API edge) |
| Database | SQLite via Drizzle ORM (auth today; domain DB decision pending) |
| Build (backend) | tsx (dev), tsup → `dist/` (production) |
| Mobile | Flutter 3.44 stable (placeholder) |
| Language | TypeScript ~5.9 (7.0 verified for builds; pinned because typescript-eslint blocks TS 7) |
| Monorepo | npm workspaces (`web`, `backend`) |

## Architecture

Feature-driven, five-layered, event-driven — details in
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). In brief:

```
              ┌───────────────────────── web (Next.js) ─────────────────────┐
              │  (pwa) bottom navbar          (admin) sidebar               │
              └──────────────────────────────┬──────────────────────────────┘
                                             │ fetch (envelope, credentials)
                                             ▼
        ┌──────────────────────── backend (Hono) ──────────────────────────┐
        │  app.ts: CORS → Better Auth (/auth/**) → /api/v1/* (session)     │
        │                                                                  │
        │  features/<name>/                                                │
        │    presentation/  (Hono routers + zod validation)   ── Layer 1   │
        │    application/  (use cases, orchestration)        ── Layer 2   │
        │    domain/       (entities, invariants, ports,     ── Layer 3   │
        │                   event definitions)                             │
        │    infrastructure/ (repositories, adapters)        ── Layer 4   │
        │                                                                  │
        │  core/  event bus · http envelope · errors · logging ·           │
        │         env · container (composition root)          ── Layer 5   │
        └──────────────────────────────────────────────────────────────────┘
                                             │ events
                                             ▼
                     notifications subscribers → WhatsApp / email adapters
                     (future: billing, QR printing, audit, … subscribe too)
```

Rules: dependencies point inwards (domain knows nothing external);
features never import each other's internals; cross-feature effects go
through the event bus; one failing event handler can never fail the
workflow that published the event.

## Repository structure

```
swapnagarments/
├── web/                      # Next.js app — PWA + admin panel
│   └── src/app/              #   (pwa)/ and (admin)/ route groups (planned)
├── backend/                  # Hono API — all business logic
│   ├── src/
│   │   ├── index.ts          #   server entry
│   │   ├── app.ts            #   middleware + route assembly
│   │   ├── core/             #   shared kernel (layers above)
│   │   └── features/         #   auth ★, orders ★, notifications ★,
│   │                         #   customers/measurements/workflow/qr/billing
│   │                         #   (scaffolded READMEs)
│   ├── drizzle.config.ts     #   schema push config
│   ├── data/                 #   SQLite db (gitignored)
│   └── .env.example
├── mobile/                   # Flutter app (placeholder)
├── docs/                     # all documentation (see index below)
└── package.json              # npm workspaces root
```

## Getting started

**Prerequisites:** Node.js ≥ 22, npm ≥ 10. (Flutter 3.44 only for
`mobile/`.)

```bash
git clone git@github.com:cbabijith/swapnagarments.git
cd swapnagarments
npm install                          # installs web + backend workspaces

# Backend configuration
cp backend/.env.example backend/.env
# generate a secret and put it in backend/.env as BETTER_AUTH_SECRET:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

npm run db:push                      # create SQLite tables
npm run dev:backend                  # → http://localhost:3001
npm run dev:web                      # → http://localhost:3000 (separate terminal)
```

**Scripts (repo root):**

| Script | What it does |
| ------ | ------------ |
| `npm run dev:web` | Next.js dev server (port 3000) |
| `npm run dev:backend` | Hono dev server with watch (port 3001) |
| `npm run build` | Production build of all workspaces (type-checked) |
| `npm run lint` | ESLint across workspaces |
| `npm run typecheck` | TypeScript check across workspaces |
| `npm run db:push` | Apply the Drizzle schema to SQLite |

**First user:** sign up via the API (no UI yet — see
[API reference](#api-reference)) or the sign-in screen once backlog
issue #8 lands.

## Configuration reference

`backend/.env` (all optional except `BETTER_AUTH_SECRET` in production;
defaults suit development):

| Variable | Default | Purpose |
| -------- | ------- | ------- |
| `PORT` | `3001` | Backend port |
| `WEB_ORIGIN` | `http://localhost:3000` | Allowed CORS origin + Better Auth trusted origin |
| `BETTER_AUTH_SECRET` | dev fallback | Session/token signing key — **generate your own** |
| `BETTER_AUTH_URL` | `http://localhost:3001/auth` | **Must include the `/auth` path** (BA derives its base path from it) |
| `DATABASE_FILE` | `./data/swapna.db` | SQLite file path |
| `LOG_LEVEL` | `info` | `debug`/`info`/`warn`/`error` |
| `APP_NAME` | `Swapna Garments` | Display name |
| `SMTP_*`, `MAIL_FROM`, `WHATSAPP_*` | — | Reserved for the notification provider backlog items |

Web reads `NEXT_PUBLIC_API_URL` (default `http://localhost:3001`) once the
API client lands (backlog #4).

## API reference

Base URL: `http://localhost:3001`. All responses use one envelope:

```jsonc
// success                                  // failure
{ "success": true, "data": { … } }          { "success": false,
                                              "error": { "code": "…",
                                                         "message": "…",
                                                         "details": […] } }
```

Error codes → HTTP: `VALIDATION_ERROR` 400 · `UNAUTHORIZED` 401 ·
`NOT_FOUND` 404 · `CONFLICT` 409 · `DOMAIN_RULE_VIOLATION` 422 ·
`INTERNAL_ERROR` 500.

### Public

| Method | Path | Description |
| ------ | ---- | ----------- |
| GET | `/health` | Service health (status, app, environment, time) |
| POST/GET | `/auth/**` | Better Auth: `/auth/sign-up/email`, `/auth/sign-in/email`, `/auth/sign-out`, `/auth/get-session`, `/auth/ok` |

### Authenticated (`/api/v1/*` — session cookie or bearer)

| Method | Path | Description |
| ------ | ---- | ----------- |
| GET | `/api/v1/me` | Current signed-in user |
| POST | `/api/v1/orders` | Create an order (publishes `order.created`) |
| GET | `/api/v1/orders` | List orders; `?status=` and `?priority=` filters |
| GET | `/api/v1/orders/:id` | Order detail |
| PATCH | `/api/v1/orders/:id` | Change status `{ "status": "…" }` (publishes `order.status.changed`) |
| GET | `/api/v1/events` | Recent domain events, newest first, `?limit=` (≤ 200) |

**Example — sign up and create an order:**

```bash
curl -X POST http://localhost:3001/auth/sign-up/email \
  -H "Content-Type: application/json" \
  -d '{"name":"Shop Owner","email":"owner@swapna.test","password":"SuperSecret123"}' \
  -c cookies.txt

curl -X POST http://localhost:3001/api/v1/orders -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"customerName":"Lakshmi Nair","customerPhone":"9876543210",
       "customerEmail":"lakshmi@example.com",
       "items":[{"garmentType":"blouse","quantity":2,"notes":"silk, lined"}],
       "priority":"high","dueDate":"2026-09-20"}'
```

Order statuses: `received → in_progress → ready → delivered`, plus
`cancelled`; `ready → in_progress` is allowed for rework. Priorities:
`normal | high | urgent`. Garment types (placeholder catalogue): `blouse,
chudidar, pavada_davani, gown, skirt, other`. Money is always integer
minor units (paise).

## Events

State changes publish domain events; features subscribe instead of calling
each other. Current catalog (full details in
[docs/EVENTS.md](docs/EVENTS.md)):

| Event | Published when |
| ----- | -------------- |
| `order.created` | Order registered at intake |
| `order.status.changed` | Order status transitioned |
| `auth.user.created` | Staff user signed up (Better Auth hook) |

Every event carries an id, timestamp, and metadata including `actorId`
(the signed-in staff user, or `system`). Planned: `customer.created`,
`measurement.recorded`, `order.process.started/completed`,
`order.correction.requested`, `qr.tag.printed`, `invoice.generated`, …

## Development workflow

- **One issue → one branch → one PR.** Branch `feature/<issue#>-slug`, PR
  references the issue ("Closes #N"). Work backlog issues in order.
- **Definition of done:** `npm run build` and `npm run lint` clean at the
  root; manually tested against a running backend; PR explains what/how
  to test.
- **Conventions (enforced):** use-case methods are named `run(...)`, never
  `execute(...)` (security-hook requirement); zod validates at the edge;
  the response envelope is built only in presentation; events carry
  `actorId`; money in paise; domain layer stays framework-free.
- **Adding a backend feature:** mirror `backend/src/features/orders/**`
  (domain → application → infrastructure → presentation), extend
  `AppEventMap` (type-only), wire in `core/container.ts`, mount in `app.ts`.

## Roadmap

Detailed, ordered plan: [docs/BACKLOG.md](docs/BACKLOG.md) — 14 milestones:

| Milestones | Theme |
| ---------- | ----- |
| 1–2 | Web foundations, design system, auth screens |
| 3–4 | **Admin sidebar shell** · **PWA bottom navbar + installability/offline** |
| 5 | Orders on screen (dashboard, lists, detail) |
| 6–7 | Customers · measurements + full intake flow + QR label print |
| 8–9 | Orders v2 · QR + stations backend |
| 10 | Station UIs (scan, queues, corrections, workflow board) |
| 11–12 | Billing · roles & staff |
| 13–14 | Real WhatsApp/email providers · quality closeout |

Domain decisions still open (measurement fields per garment, station
ordering, WhatsApp provider, GST, database): tracked in
[docs/DOMAIN-DISCUSSION.md](docs/DOMAIN-DISCUSSION.md).

## Known limitations

- **Orders live in memory** — data resets on backend restart; the domain
  database choice is pending (auth already uses SQLite).
- **Notifications are dev adapters** — messages are logged, not sent.
- **No role enforcement yet** — any signed-in user can access everything.
- **TypeScript pinned at ~5.9** — TS 7.0 builds fine but typescript-eslint
  blocks it; bump when linter support lands.
- **Security scan incomplete** — the pre-push security scan tooling only
  completed partially on the last pushes; a full audit is recommended
  before going live.
- The Flutter `mobile/` app is a placeholder (PWA covers mobile for now).

## Documentation index

| Doc | Contents |
| --- | -------- |
| [docs/HANDOFF.md](docs/HANDOFF.md) | Developer handoff: state, setup, conventions, gotchas, scope |
| [docs/BACKLOG.md](docs/BACKLOG.md) | The 63-issue work plan (PWA + admin panel) |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Five layers, dependency rules, request lifecycle, adding a feature |
| [docs/EVENTS.md](docs/EVENTS.md) | Event catalog, payloads, subscribing, durability roadmap |
| [docs/DOMAIN-DISCUSSION.md](docs/DOMAIN-DISCUSSION.md) | Domain workshop agenda + open questions + decision log |
