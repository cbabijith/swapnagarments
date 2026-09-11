# Handoff — Swapna Garments (for Shahil)

Welcome! This document gets you productive on this repo fast: what exists,
how to run it, the rules to follow, and what you are building (a
**mobile-responsive PWA** + an **admin panel** on top of the existing Hono
backend). The full work plan with 63 numbered issues lives in
[BACKLOG.md](BACKLOG.md) — work them **one by one, in order**.

> Repo: `github.com/cbabijith/swapnagarments` (branch `main`).
> Companion reading: [ARCHITECTURE.md](ARCHITECTURE.md),
> [EVENTS.md](EVENTS.md), [DOMAIN-DISCUSSION.md](DOMAIN-DISCUSSION.md).

---

## 1. What this project is

Management software for a custom tailoring shop (ladies' blouses and other
garments). The real-world flow we are modelling:

1. Customer arrives (often with their own cloth) → customer record +
   **measurements** are taken and stored for reuse.
2. An **order** is created: items, quantities, due date, priority, quoted price.
3. A **QR label** is printed for every cloth piece.
4. The piece moves through **stations**: cutting → sizing → handloom →
   stitching → ironing (steps can repeat; corrections send pieces back).
5. The customer is notified by **WhatsApp/email at every step**.
6. On delivery: balance payment + **bill/invoice**.

## 2. Current state (what already works)

| Area | Status |
| ---- | ------ |
| Monorepo (`web` + `backend` npm workspaces, `mobile` Flutter) | ✅ Done |
| Backend: Hono 4.13, feature-driven 5-layer architecture, event bus | ✅ Done, smoke-tested |
| Backend: Better Auth (email+password, sessions, SQLite/Drizzle) | ✅ Done — `/auth/**` |
| Backend: Orders v1 (create / list / get / status change) | ✅ Done — `/api/v1/orders` |
| Backend: Notifications subscribers (email + WhatsApp) | ✅ Wired, **console adapters only** |
| Web: Next.js 16.3.4 app | ⬜ Placeholder page only — **you build the rest** |
| Mobile: Flutter 3.44 project | ⬜ Placeholder (PWA is the priority now) |
| Domain DB (customers, measurements, stations, billing) | ⬜ Not started — several backlog issues |

Verified end to end (2026-09-04): sign-up → session → create order → status
change → events feed with actor attribution → email/WhatsApp dispatch logs.

## 3. Running everything

```bash
npm install                 # repo root — installs web + backend

# backend (port 3001)
cp backend/.env.example backend/.env    # then set BETTER_AUTH_SECRET:
#   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
npm run db:push             # create SQLite tables (backend/data/swapna.db)
npm run dev:backend

# web (port 3000)
npm run dev:web

# checks before every PR
npm run build               # all workspaces
npm run lint
```

Test credentials flow: sign up via `POST http://localhost:3001/auth/sign-up/email`
(see auth feature README for curl examples). A dev `backend/.env` already
exists on the owner's machine — create your own.

## 4. Architecture in 60 seconds

- **`backend/src/features/<name>/**`** — vertical slices with four inner
  layers: `domain/` (entities, invariants, ports, events) →
  `application/` (use cases, zod schemas) → `infrastructure/` (repo +
  adapters) → `presentation/` (Hono routers). **Copy the `orders` feature
  as your template for every new one.**
- **`backend/src/core/**`** — shared kernel: event bus, HTTP envelope,
  errors, logger, env, container (composition root).
- **Cross-feature effects go through events**, never direct imports:
  a use case publishes `order.created`; notifications subscribes. Extend
  the catalog in `core/events/app-events.ts` (`import type` only).
- **Every API response** uses the envelope
  `{ "success": true, "data": … }` /
  `{ "success": false, "error": { "code", "message", "details"? } }`.
- **Web** must stay UI-only — no business logic. It talks to the backend
  via fetch (see Issue #4/#5 in BACKLOG.md).

## 5. Conventions & hard rules

1. **Name use-case methods `run(...)`, never `execute(...)`.** The security
   hook in this environment blocks file writes containing
   `something.execute(userInput)` (SQL-injection heuristic). This is
   non-negotiable in this repo.
2. All writes to source files go through the editor (scanned by the
   security hook). If a write is blocked, read the hook's feedback — fix
   the flagged pattern, don't bypass it.
3. TypeScript strict; pin stays on **5.9.x** (typescript-eslint blocks
   TS 7). Don't bump it casually.
4. Validation = **zod at the edge**: backend via
   `validateJson/validateQuery` (`core/http/validation.ts`); web forms via
   zod resolvers.
5. Events carry `metadata.actorId` (the signed-in user) — keep that when
   adding use cases.
6. Money is **integer minor units (paise)** — never floats.
7. Branches: `feature/<issue-number>-short-slug`. One issue = one branch =
   one PR referencing the issue ("Closes #12").
8. Definition of done: `npm run build` + `npm run lint` clean, manually
   tested against a running backend, PR description says what/how to test.

## 6. Known gotchas (read once, save an hour each)

- **`BETTER_AUTH_URL` must include the `/auth` path**
  (`http://localhost:3001/auth`) — Better Auth derives its base path from
  the URL pathname; without it every auth route 404s.
- Better Auth v1.7's `account` table needs the `issuer` column (it's in
  the schema — don't drop it).
- CORS: the backend allows only `WEB_ORIGIN` (default
  `http://localhost:3000`) with credentials. If you change ports, update
  `backend/.env`.
- Dev servers sometimes survive `Ctrl+C` on Windows — check
  `netstat -ano | findstr :3001` and kill stale PIDs if ports clash.
- Orders data is **in-memory** today — it resets on backend restart. Don't
  "fix" this; a DB decision is pending (see §8).
- Superseded stubs `backend/src/features/orders/presentation/orders-api.ts`
  and `backend/src/core/http/with-route.ts` exist as markers — ignore (or
  delete in a cleanup PR; the hook blocks shell deletes).

## 7. Your scope — PWA + Admin Panel (one Next.js app, two experiences)

The web app serves **both** experiences in one codebase via route groups:

```
web/src/app/
├── (pwa)/      # shop-floor + counter experience — BOTTOM NAVBAR
│   ├── home/ orders/ scan/ stations/ more/
├── (admin)/    # owner/office experience — SIDEBAR
│   ├── admin/ dashboard, orders, customers, workflow, billing, staff, settings
└── sign-in/    # shared login
```

- **PWA** (`(pwa)`): installable, offline-tolerant, thumb-friendly. Bottom
  navbar: **Home · Orders · [Scan] · Stations · More**. This is what staff
  use on phones at the counter and at stations.
- **Admin** (`(admin)`): desktop-first with a collapsible **sidebar**:
  Dashboard, Orders, Customers, Workflow, Billing, Staff, Settings. Also
  responsive (sidebar becomes a drawer), but desktop is the target.
- Shared: auth, API client, components, design tokens.
- Use `better-auth/react` client on the web for sign-in/sign-out/session.
- Data fetching: TanStack Query. UI kit: shadcn/ui + lucide icons.
  Service worker: `@serwist/next`. QR scanning: `html5-qrcode` (or
  BarcodeDetector where available). These are recommendations — if you
  know better tools, propose in the PR.

## 8. Open decisions (don't guess — ask in the issue thread)

- **Domain database** (PostgreSQL recommended, undecided). Backend issues
  in Milestones 6–9 can start against the in-memory pattern, but
  persistence must land before real shop data.
- **Roles** (owner/counter/master tailor/…) — until decided, every signed-in
  user can see both PWA and admin. Issue #55–#57 add real gating.
- **WhatsApp provider** (Meta Cloud API vs aggregators) and template
  language (English/Malayalam/both).
- Flutter `mobile/` app: on hold — the PWA is the mobile story for now.

## 9. Where the details live

| Topic | File |
| ----- | ---- |
| Your work plan (63 issues, in order) | [BACKLOG.md](BACKLOG.md) |
| Layers, request lifecycle, adding a feature | [ARCHITECTURE.md](ARCHITECTURE.md) |
| Event catalog + subscribing guide | [EVENTS.md](EVENTS.md) |
| Domain open questions | [DOMAIN-DISCUSSION.md](DOMAIN-DISCUSSION.md) |
| Existing endpoints | `backend/src/app.ts` + feature READMEs |

When an issue says "follow the feature pattern", it means: re-read
§4 above + the `orders` feature source, then mirror it.
