# Swapna Garments — responsive website

A Next.js website for the tailoring shop, with a desktop sidebar, mobile bottom
navigation, and a server-side connection to the existing Railway PostgreSQL
database. The Hono and Flutter workspaces are not required to run this website.

## Run locally

From the repository root:

```bash
npm ci
npm run dev:web
```

Open http://localhost:3000. Without a database URL, development shows a clearly
labelled sample workspace. Preview changes last until a full refresh.

To use real data, copy `.env.example` in this folder to `.env.local` and provide
`DATABASE_URL`, `SETUP_TOKEN`, and `APP_ORIGIN`. A Railway private hostname only
works inside Railway; local access requires an already-enabled public database
endpoint. Never put database credentials in `NEXT_PUBLIC_*` variables.

## What is included

Overview and daily reports, customer records and blouse measurements, multi-piece
orders, priority queues, per-piece station progress and corrections, QR labels
and camera/manual lookup, advances/balances, delivery, CSV export, owner sign-in,
and a team directory. Live writes are validated and persisted in PostgreSQL;
preview data is never inserted into the live database.

See [the website handoff](../docs/WEBSITE.md) for the exact Railway resources,
deployment settings, persistence model, security boundaries, and remaining scope.

## Checks

```bash
npm run build -w web
npm run lint -w web
npm run typecheck -w web
npm run test -w web
```

Tests run against an isolated PostgreSQL WASM engine and do not touch Railway.

## Structure

- `src/app/` — pages and protected Next.js API routes.
- `src/components/` — responsive shell, forms, views, and live/preview provider.
- `src/lib/workspace.ts` — shared types, formatting, explicitly labelled samples.
- `src/lib/workspace-mutations.ts` — validated, transactional shop commands.
- `src/lib/server/` — PostgreSQL, owner authentication, and safe responses.
- `tests/` — workflow and PostgreSQL route integration tests.

## Design

Warm white and sage surfaces, forest-green actions, serif page headings, and
Geist for interface text. Shared tokens live in `src/app/globals.css`. Layouts
adapt at 760px and 1060px, with additional narrow-phone refinements below 470px.
Dialogs use the browser's modal focus management; forms have native validation,
visible focus states, and touch-sized mobile controls.
