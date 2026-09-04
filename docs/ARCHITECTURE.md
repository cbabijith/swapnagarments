# Architecture

Feature-driven, five-layered, event-driven architecture in an npm-workspaces
monorepo. The guiding rules:

1. **The backend owns business logic.** `web` (Next.js) is the dashboard UI;
   `mobile` (Flutter) is the station/staff app; `backend` (Hono) owns the
   APIs, auth, validation and events.
2. **Features are vertical slices.** Each business capability (orders,
   auth, measurements, workflow, …) owns its code end to end under
   `backend/src/features/<name>/`.
3. **Layers inside a feature follow Clean Architecture dependency rules** —
   dependencies point inwards; the domain knows nothing about the outside
   world.
4. **Features never import each other's internals** — only their public
   `index.ts` (plus domain event definitions, the integration contract).
5. **Side effects across features happen through domain events**, not
   direct calls (orders publishes `order.created`; notifications
   subscribes).

## Monorepo layout

```
swapnagarments/
├── web/          # Next.js 16.3.4 — dashboard UI (port 3000)
├── backend/      # Hono 4.13 API (port 3001) — this file's focus
│   └── src/
│       ├── index.ts       # server entry (@hono/node-server + dotenv)
│       ├── app.ts         # Hono app assembly (CORS, onError, auth mount, /api/v1)
│       ├── core/          # shared kernel (layer 5)
│       └── features/      # vertical slices (layers 1–4 inside)
├── mobile/       # Flutter 3.44 — station scanning & staff app
├── docs/         # this documentation
└── package.json  # npm workspaces root (web + backend)
```

## The five layers (inside the backend)

| # | Layer          | Location                                  | Responsibility                                                          |
| - | -------------- | ----------------------------------------- | ----------------------------------------------------------------------- |
| 1 | Presentation   | `features/*/presentation`                  | Hono routers, zod validation (`validateJson`/`validateQuery`), response shaping. No business logic. |
| 2 | Application    | `features/*/application`                   | Use cases: orchestrate domain + ports, publish events, attribute actors. |
| 3 | Domain         | `features/*/domain`                        | Entities, invariants, state transitions, ports, event definitions.       |
| 4 | Infrastructure | `features/*/infrastructure`                | Port implementations: repositories, DB (Drizzle/SQLite), email/WhatsApp adapters. |
| 5 | Shared kernel  | `src/core`                                 | Event bus, HTTP envelope, errors, logging, env, composition root.        |

Dependency direction:

```
Presentation ──▶ Application ──▶ Domain
                    │               ▲
                    │ (implements)  │ ports
                    └── Infrastructure
                             │
Shared kernel ◀── everybody (core depends on no feature at runtime,
                   except app-events.ts, a type-only catalog)
```

## Request lifecycle (example: create order)

```
POST /api/v1/orders                     (Hono, app.ts)
  └─ cors → requireSession              Better Auth session resolved (cookie/bearer);
        │                               401 otherwise; user id available as actor
        └─ ordersRouter.post("/")       features/orders/presentation
             ├─ validateJson(schema)    @hono/zod-validator → 400 envelope on bad input
             └─ application/create-order  run(dto, actorId)
                  ├─ domain/order        createOrderEntity() enforces invariants
                  ├─ domain port OrderRepository
                  │    └─ infrastructure/in-memory-order-repository
                  └─ core event bus      publish "order.created" (metadata.actorId)
                       ├─ notifications handler ──▶ email + whatsapp adapters (L4)
                       └─ (future: audit, billing, QR printing, …)

app.onError → every thrown AppError becomes the uniform JSON envelope.
```

## Composition root

`backend/src/core/container.ts` is the only file that picks concrete
implementations (which repository, which bus, which adapters, the Drizzle
database and the Better Auth instance) and wires them. Cross-feature event
handlers are registered there at startup.

## Auth (Better Auth)

- Mounted at `/auth/**` (`auth.handler(c.req.raw)`); the URL is configured
  as `BETTER_AUTH_URL=http://localhost:3001/auth` — **Better Auth derives
  its base path from the URL pathname**, so the `/auth` suffix is required.
- Persistence: Drizzle + SQLite file (`backend/data/swapna.db`), schema in
  `features/auth/infrastructure/schema.ts`, applied with `npm run db:push`.
- `requireSession` middleware protects everything under `/api/v1/*`.
- Signup publishes `auth.user.created` via a Better Auth `databaseHooks`
  hook — auth joins the event-driven flow.

## How to add a feature

1. Create `backend/src/features/<name>/{domain,application,infrastructure,presentation}`.
2. Domain: entities + invariants + ports + event payload types
   (`<name>-events.ts`); extend `AppEventMap` in `core/events/app-events.ts`
   (`import type` only).
3. Application: zod schemas + use-case classes taking `{ repository, events,
   logger }` ports; publish events with `metadata.actorId`.
4. Infrastructure: implement the ports (start in-memory).
5. Presentation: a Hono router using `validateJson`/`validateQuery`.
6. Wire in `core/container.ts` and mount in `app.ts`; subscribe cross-feature
   handlers in the container.

## Current trade-offs (setup phase)

- **Orders repository is in-memory** — resets on restart; swap for the real
  DB once the domain database is decided (only `infrastructure/` +
  `container.ts` change).
- **Auth uses SQLite** — deliberate: real persistence on day one without
  pre-empting the Postgres/other decision; migrating is contained to the
  auth feature's infrastructure folder.
- **In-process event bus** — events are lost if the process dies between
  publish and delivery; natural next step is the transactional outbox
  pattern with the future database (see EVENTS.md roadmap).
- **No role model yet** — everyone authenticated can call everything;
  staff roles are a workshop topic (Better Auth supports roles/plugins).
