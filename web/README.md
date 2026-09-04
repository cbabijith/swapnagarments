# @swapna-garments/web

The web dashboard for Swapna Garments, built with **Next.js 16.3.4**
(App Router, Turbopack, Tailwind CSS v4, TypeScript strict).

This app is the UI layer only — all business logic, validation and the
event-driven APIs live in the **Hono backend** (`../backend`, Better Auth +
Zod, http://localhost:3001). Web ↔ backend integration (sign-in screens,
order dashboards, station views) starts after the domain workshop
(`../docs/DOMAIN-DISCUSSION.md`).

## Scripts

Run from the repo root or from `web/`:

```bash
npm run dev:web        # http://localhost:3000
npm run build -w web   # production build (type-checked)
npm run lint -w web
```
