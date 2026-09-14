# Auth (Better Auth)

Staff authentication for the API, powered by
[Better Auth](https://better-auth.com) (email + password, cookie or bearer
sessions) with a Drizzle/SQLite persistence layer.

## How it's wired

- `auth.ts` — `createAuth(deps)` builds the Better Auth instance: Drizzle
  adapter (SQLite provider), trusted origin = web app, and a `databaseHooks`
  hook that publishes `auth.user.created` on the application event bus, so
  auth joins the event-driven flow (future: provisioning employee records,
  welcome notifications, audit).
- `infrastructure/schema.ts` — Better Auth core tables (`user`, `session`,
  `account`, `verification`) as a Drizzle SQLite schema; applied with
  `bun run --cwd backend db:push` (drizzle-kit).
- `presentation/session-middleware.ts` — `requireSession` guards `/api/v1/*`:
  resolves the session and exposes it as `c.get("session")` (user id becomes
  `actorId` on events published by use cases).
- The Hono app mounts Better Auth's handler at `/auth/*` — sign-up, sign-in,
  sign-out, session, etc. are handled there.

## Try it

```bash
curl -X POST http://localhost:3001/auth/sign-up/email \
  -H "Content-Type: application/json" \
  -d '{"name":"Owner","email":"owner@swapna.test","password":"SuperSecret123"}' -c cookies.txt
```

## Open questions

- Roles (owner / counter / master tailor / station staff) — planned with the
  employees feature; Better Auth supports a role field + admin plugin.
  See docs/DOMAIN-DISCUSSION.md §4.
