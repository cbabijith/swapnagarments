# Swapna Garments — Tailoring Management System

Management software for the Swapna Garments custom tailoring shop (ladies'
blouses and other garments): order intake with customer measurements,
shop-floor workflow (cutting, sizing, handloom, stitching, ironing), QR
labels per piece, billing, and customer notifications (email + WhatsApp) on
every step.

**Status: foundation complete.** Monorepo with a Next.js web app, a Hono
backend (Better Auth + Zod + event-driven APIs) and a Flutter mobile app.
Business features are built after the domain workshop — see
[docs/DOMAIN-DISCUSSION.md](docs/DOMAIN-DISCUSSION.md).

## Monorepo layout

```
swapnagarments/
├── web/        # Next.js 16.3.4 dashboard (UI layer, port 3000)
├── backend/    # Hono API: Better Auth, Zod, event-driven features (port 3001)
│   └── src/
│       ├── app.ts / index.ts    # Hono app assembly + server entry
│       ├── core/                # shared kernel: event bus, http, errors, logging, container
│       └── features/            # vertical slices (domain/application/infrastructure/presentation)
│           ├── auth/            # ★ Better Auth (email+password, sessions, SQLite/Drizzle)
│           ├── orders/          # ★ reference feature (all layers, Hono router)
│           └── notifications/   # ★ event subscribers (email/WhatsApp dev adapters)
├── mobile/     # Flutter app (station QR scanning, staff views — planned)
├── docs/       # architecture, event catalog, domain workshop agenda
└── package.json # npm workspaces root
```

## Stack

| Piece      | Choice                                              |
| ---------- | --------------------------------------------------- |
| Web        | Next.js 16.3.4 (App Router, Turbopack), Tailwind v4 |
| Backend    | Hono 4.13 on @hono/node-server                      |
| Auth       | Better Auth 1.7 (email + password, sessions)        |
| Validation | Zod 4 (@hono/zod-validator on the API)              |
| Database   | SQLite via Drizzle (auth today; domain DB pending)  |
| Mobile     | Flutter 3.44 stable                                  |
| Language   | TypeScript 5.9 strict                                |

\* TypeScript 7.0.2 was verified — `next build` and type-check pass — but
`typescript-eslint` (required by `eslint-config-next`) hard-blocks TS 7
today, so workspaces pin 5.9.x. Bump when typescript-eslint ships 7.x
support.

## Getting started

```bash
npm install                # installs web + backend workspaces

npm run dev:backend        # Hono API on http://localhost:3001
npm run dev:web            # Next.js on http://localhost:3000

npm run db:push            # apply backend DB schema (SQLite file)
npm run build              # build all workspaces
npm run lint               # lint all workspaces
```

Backend configuration: copy `backend/.env.example` to `backend/.env` and set
`BETTER_AUTH_SECRET` (a random 32-byte hex). A dev `.env` is already in
place locally.

## Try the backend

```bash
curl http://localhost:3001/health

# staff sign-up (session cookie into cookies.txt)
curl -X POST http://localhost:3001/auth/sign-up/email \
  -H "Content-Type: application/json" \
  -d '{"name":"Shop Owner","email":"owner@swapna.test","password":"SuperSecret123"}' \
  -c backend/data/cookies.txt

# create an order (auth required) → publishes order.created
curl -X POST http://localhost:3001/api/v1/orders -b backend/data/cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"customerName":"Lakshmi Nair","customerPhone":"9876543210",
       "items":[{"garmentType":"blouse","quantity":2}],"dueDate":"2026-09-15"}'

# see the event stream (auth required)
curl http://localhost:3001/api/v1/events -b backend/data/cookies.txt
```

## Documentation

- [docs/HANDOFF.md](docs/HANDOFF.md) — developer handoff: state, setup,
  conventions, scope for the PWA + admin panel build
- [docs/BACKLOG.md](docs/BACKLOG.md) — the 63-issue work plan (PWA + admin
  panel + supporting backend), to be worked in order
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — five layers, dependency
  rules, request lifecycle, how to add a feature
- [docs/EVENTS.md](docs/EVENTS.md) — event catalog and the event-driven API
  model
- [docs/DOMAIN-DISCUSSION.md](docs/DOMAIN-DISCUSSION.md) — agenda + open
  questions for the domain workshop (the next phase)
