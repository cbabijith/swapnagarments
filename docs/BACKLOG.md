# Backlog — PWA + Admin Panel (work in order, one issue per PR)

63 issues in 14 milestones. Each issue gives you the *what* and a brief
idea of the *how* — the implementation craft is yours. Read
[HANDOFF.md](HANDOFF.md) first (conventions in §5, gotchas in §6).
Backend issues say "feature pattern" — that means mirror
`backend/src/features/orders/**` exactly (domain → application →
infrastructure → presentation, events published, wired in the container).

**Every PR:** branch `feature/<issue>-slug`, references the issue
("Closes #N"), `bun run build` + `bun run lint` clean, tested against a
running backend.

---

## Milestone 1 — Web foundations (issues 1–7)
*Goal: the web workspace is structured, wired to the backend, and has the
primitives every screen needs.*

### #1 — Two-experience app structure
**What:** Split the app into route groups `(pwa)` and `(admin)` with a shared root.
**Do:** Create `web/src/app/(pwa)/` and `web/src/app/(admin)/`; move the current
placeholder page into `(pwa)/home`; `/` redirects to `/home`; placeholder
`/admin` page under `(admin)`. Both layouts render children for now.
**Done when:** `/` → `/home` works, `/admin` renders, build passes.

### #2 — Design tokens & theming
**What:** One visual language for both experiences.
**Do:** Extend `globals.css` (Tailwind v4 `@theme`) with brand colors (suggest
teal/emerald family fitting a textiles shop), spacing, radii; support light +
dark mode via a class toggle; document tokens in `web/README.md`.
**Done when:** tokens used everywhere afterwards; no hard-coded hex in components.

### #3 — Component library setup
**What:** shadcn/ui + icons so all screens share primitives.
**Do:** Init shadcn/ui in `web` (works with Tailwind v4), add `lucide-react`;
add the base components you'll need (button, input, select, dialog, sheet,
table, card, badge, tabs, dropdown-menu, sonner).
**Done when:** `bun run --cwd web build` passes with components generated.

### #4 — Better Auth client + env config
**What:** Web signs in/out against the backend properly.
**Do:** Add `better-auth` to `web`, create `createAuthClient()` from
`better-auth/react` pointing at `NEXT_PUBLIC_API_URL` (default
`http://localhost:3001`); add `web/.env.example`.
**Done when:** client can call `signIn.email` against a running backend.

### #5 — API client layer
**What:** One typed fetch wrapper everyone uses.
**Do:** `web/src/lib/api.ts`: base URL from env, `credentials: "include"`,
unwraps the `{success,data}` envelope, throws typed errors from the
`error` envelope, 401 → redirect to sign-in.
**Done when:** a sample call to `/api/v1/me` returns typed user or redirects.

### #6 — TanStack Query setup
**What:** Server state management with caching.
**Do:** Add `@tanstack/react-query` + devtools, providers in root layout,
conventions for query keys (`["orders","list",filters]`).
**Done when:** devtools visible, one demo query on home.

### #7 — Feedback primitives
**What:** Toasts, confirm dialogs, skeletons, empty/error states.
**Do:** Wire sonner toasts; a `<ConfirmDialog>`; `PageSkeleton`,
`EmptyState`, `ErrorState` components used consistently later.
**Done when:** demo of each in a scratch route; then remove demo.

## Milestone 2 — Authentication (issues 8–10)
*Goal: staff can sign in, sessions are guarded everywhere.*

### #8 — Sign-in page
**What:** Clean mobile+desktop login.
**Do:** `web/src/app/sign-in/page.tsx`: email+password form (zod validated),
calls Better Auth client, error states ("Invalid email or password"),
redirect to `/home` on success.
**Done when:** real backend credentials log you in; wrong password shows error.

### #9 — Session guard + logout
**What:** No screen renders without a session.
**Do:** A client guard component in `(pwa)` and `(admin)` layouts: fetch
`/api/v1/me`, loading state, 401 → `/sign-in`; logout action in both shells.
**Done when:** visiting `/home` signed-out redirects; logout returns to sign-in.

### #10 — Root redirect + user chip
**What:** Sensible entry point and identity display.
**Do:** `/` redirects signed-in users to `/home`; user name chip/avatar in
shells from session data.
**Done when:** flows feel complete end to end.

## Milestone 3 — Admin shell: the sidebar (issues 11–15)
*Goal: the admin panel skeleton with sidebar modules, ready for screens.*

### #11 — Admin sidebar navigation
**What:** The core navigation requested for the admin panel.
**Do:** Collapsible sidebar (desktop) + drawer (mobile) in `(admin)` layout:
**Dashboard, Orders, Customers, Workflow, Billing, Staff, Settings**; active
route highlighting, icons, section for "planned" items that route to a
"coming soon" page.
**Done when:** all seven modules navigable, collapse state persists
(localStorage), keyboard accessible.

### #12 — Admin topbar + page headers
**What:** Context bar above content.
**Do:** Topbar with page title/breadcrumbs, global search input (wired later
in #57), user menu (profile, logout).
**Done when:** breadcrumbs reflect URL; user menu works.

### #13 — Data table primitive
**What:** Every list screen builds on this.
**Do:** Generic `DataTable` (on shadcn table): column defs, sorting, async
pagination, row actions slot, loading skeleton, empty state.
**Done when:** demo with mocked rows; reused in #21/#22.

### #14 — Form primitives
**What:** Forms are consistent and validated.
**Do:** `FormField` wrappers with labels/errors bound to zod + a `useZodForm`
helper; number/stepper, date picker, textarea variants.
**Done when:** used in #8 retroactively or next form built.

### #15 — Status & priority badges
**What:** Shared visual language for order states.
**Do:** Badge components for order status (`received/in_progress/ready/
delivered/cancelled`) and priority (`normal/high/urgent`) with colors.
**Done when:** single source in `web/src/lib/orders.ts` mapping status→badge.

## Milestone 4 — PWA shell: the bottom navbar (issues 16–20)
*Goal: the installable, phone-first experience exists.*

### #16 — Bottom navbar
**What:** The core navigation requested for the PWA.
**Do:** In `(pwa)` layout: fixed bottom navbar — **Home · Orders · Scan
(center, raised FAB button) · Stations · More**; active state, safe-area
inset (`env(safe-area-inset-bottom)`), hides when keyboard open.
**Done when:** all five tabs navigate (placeholder pages ok), thumb-reachable,
no layout shift.

### #17 — PWA manifest + icons
**What:** Installable app identity.
**Do:** `public/manifest.webmanifest` (name, short_name, theme color from #2,
display standalone, icons 192/512 + maskable); metadata in layout
(`theme-color`, apple-touch-icon, viewport-fit=cover).
**Done when:** Chrome DevTools → Application → Manifest shows no warnings;
"Install app" works.

### #18 — Service worker + offline shell
**What:** Basic offline behaviour.
**Do:** Add `@serwist/next`, precache app shell, network-first for API with
offline fallback page; skip waiting + update prompt toast.
**Done when:** offline load shows the shell/fallback, not the dino.

### #19 — Install prompt UX
**What:** Nudge staff to install.
**Do:** Custom "Add to Home Screen" hint (beforeinstallprompt captured,
dismissable, remembered); iOS instructions fallback.
**Done when:** hint appears once on mobile, install works.

### #20 — Mobile UX audit
**What:** It must feel native-ish.
**Do:** Audit all PWA routes: 44px+ touch targets, no horizontal scroll,
font sizes, pull-to-refresh feel (refetch on focus via TanStack), loading
skeletons.
**Done when:** Lighthouse mobile ≥ 90 on home/orders.

## Milestone 5 — Orders read path (issues 21–25)
*Goal: real data on screen using the existing API.*

### #21 — Admin dashboard
**What:** Landing screen with the numbers that matter.
**Do:** Cards: today's orders, in-progress, ready, overdue (computed from
dueDate vs status client-side for now); "due soon" list linking to orders.
**Done when:** reflects real data after creating orders via curl/UI.

### #22 — Admin orders table
**What:** Searchable, filterable order list.
**Do:** `DataTable` (#13) over `GET /api/v1/orders` with `?status=&priority=`
filters, search box (client-side filter is fine for now), row click → detail.
**Done when:** filters hit the API; states handled.

### #23 — Admin order detail
**What:** Everything about one order.
**Do:** `GET /api/v1/orders/:id`: header (number, status badge, priority,
due date), customer block, items table, notes, status timeline (client-side
history for now — server timeline comes with workflow events in #40).
**Done when:** deep-linkable URL `/admin/orders/:id`.

### #24 — PWA home
**What:** Shop-floor glance screen.
**Do:** Today summary (reuse #21 queries), quick actions: New Order (later
#35), Scan (→ #43), station shortcuts, overdue alert banner.
**Done when:** useful at a glance on a phone.

### #25 — PWA orders list
**What:** Card list of orders for phones.
**Do:** Card per order (number, customer, items count, status badge, due);
chips filter by status; infinite scroll or "load more".
**Done when:** smooth on 3G throttling (skeletons, no jank).

## Milestone 6 — Customers (issues 26–29)
*Goal: customers exist in the backend and the UI. First "feature pattern"
replication — study the orders feature first.*

### #26 — Backend: customers feature
**What:** Customer CRUD + phone lookup.
**Do:** New feature `backend/src/features/customers/` following the pattern:
domain (entity: id, name, phone, email?, notes, createdAt), zod schemas,
in-memory repo, Hono router (`POST/GET /api/v1/customers`,
`GET /api/v1/customers/:id`, `GET /api/v1/customers?phone=`), events
(`customer.created`), wire in container + app.ts.
**Done when:** curl CRUD works; event appears in `/api/v1/events`.

### #27 — Customer finder (combobox)
**What:** Fast phone/name lookup used at intake.
**Do:** Debounced search combobox hitting the phone endpoint; "create new
customer" inline flow; recent customers when empty query.
**Done when:** find-by-phone in ≤ 2 keystrokes-debounces; new customer creatable inline.

### #28 — Admin customers directory + detail
**What:** Customers sidebar module becomes real.
**Do:** DataTable (name, phone, orders count, last order), detail page with
contact info + order history (linked later in #29).
**Done when:** navigable from sidebar; search works.

### #29 — Orders ↔ customers link
**What:** Orders belong to real customers.
**Do:** Backend: order create accepts `customerId` (validate exists; keep
name/phone snapshot fields for receipts); list/detail return customer ref.
Web: intake uses #27 picker.
**Done when:** order detail links to customer; customer detail shows orders.

## Milestone 7 — Measurements + order intake (issues 30–35)
*Goal: the heart of the counter experience — full intake flow on the PWA.*

### #30 — Backend: measurement profiles
**What:** Field definitions per garment type.
**Do:** `features/measurements/`: garment profile registry (e.g. blouse:
bust, waist, hip, shoulder, sleeve, neck depth, length, looseness note —
exact fields pending workshop, make them configurable), endpoints to
list/create profiles. Keep fields data-driven, not hard-coded columns.
**Done when:** profiles CRUD-able via API.

### #31 — Backend: record measurements
**What:** Sizes stored per customer (reusable) with per-order overrides.
**Do:** `PUT /api/v1/customers/:id/measurements` (versioned history),
order create accepts per-order overrides; events (`measurement.recorded`).
**Done when:** repeat order can copy last profile via API.

### #32 — Intake: measurement form
**What:** Dynamic measurement entry on the PWA.
**Do:** In the new-order flow: pick garment → form renders profile fields
(#30), numeric keypad-friendly inputs (inputMode=decimal), prefill from
customer's last profile with "changed" highlighting.
**Done when:** measuring a blouse takes < 60 seconds.

### #33 — Intake: items & materials
**What:** What the customer handed over.
**Do:** Item builder: garment type, quantity, notes; per-item "customer
material" toggle + description (the cloth they gave — exact tracking
fields pending backend #37).
**Done when:** multi-item order with notes builds correctly.

### #34 — Intake: due date, priority, review
**What:** Final step before submit.
**Do:** Date picker (min = today), priority selector, order-level notes,
review screen summarizing everything.
**Done when:** validation errors surface clearly per step.

### #35 — Intake: submit + QR label print
**What:** Order lands in the system, label prints.
**Do:** Submit → `POST /api/v1/orders` → success screen; print view for the
order label (order number + QR placeholder graphic for now — real QR comes
with #39) sized for thermal 40mm and A4; `window.print()` + print CSS.
**Done when:** counter staff can go end-to-end: customer → measurements →
items → due date → submit → printed slip.

## Milestone 8 — Orders v2 backend (issues 36–38)
*Goal: operational endpoints the screens will need.*

### #36 — Backend: order edit + cancel
**What:** Fix mistakes, cancel orders.
**Do:** `PATCH /api/v1/orders/:id` (items/notes/dueDate while `received`),
`POST /api/v1/orders/:id/cancel` with reason; events (`order.cancelled`).
**Done when:** transitions still guarded; notifications fire.

### #37 — Backend: customer materials tracking
**What:** The cloth/items the shop received.
**Do:** Materials sub-entity per order item (type, color/notes, quantity,
returnable flag, returned-at); endpoints to mark returned; event.
**Done when:** curl lifecycle: give cloth → mark returned.

### #38 — Backend: priority queue endpoint
**What:** The ordered worklist driving stations + lists.
**Do:** `GET /api/v1/orders/queue`: open orders sorted urgent-first then
earliest dueDate; station-scoped variant comes with #42.
**Done when:** stable sort verified with mixed fixtures.

## Milestone 9 — QR + stations backend (issues 39–42)
*Goal: the engine of the shop floor. Biggest backend milestone.*

### #39 — Backend: QR tags
**What:** A tag per cloth piece.
**Do:** `features/qr-tags/`: generate per item on order create (event
subscriber), tag payload = signed reference to order+item (HMAC, env key),
`GET /api/v1/qr/:code` resolves → item identity, current station, next
step; reprint endpoint.
**Done when:** scanning a generated code via curl returns the item card data.

### #40 — Backend: stations + check-in/out
**What:** Pieces move through work.
**Do:** `features/process-workflow/`: station model (cutting, sizing,
handloom, stitching, ironing — ordered per garment, some repeatable),
`POST /api/v1/items/:itemId/stations/:stationId/check-in|check-out` with
employee + timestamp, events (`order.process.started/completed` — these
drive customer notifications already subscribed pattern).
**Done when:** a full blouse pass through all stations via curl; every step
appears in events + triggers notification logs.

### #41 — Backend: corrections/rework
**What:** Send a piece back.
**Do:** `POST /api/v1/items/:itemId/corrections` (target station, reason,
who); reopens workflow; repeatable — history retained; event
(`order.correction.requested`).
**Done when:** ready → ironing correction → ready again works.

### #42 — Backend: station queues
**What:** What each employee sees next.
**Do:** `GET /api/v1/stations/:id/queue` — items at/for a station ordered
by #38 rules; `GET /api/v1/stations` list with load counts.
**Done when:** queue order matches priority rules.

## Milestone 10 — Station UIs (issues 43–48)
*Goal: the PWA becomes the daily tool.*

### #43 — PWA scan page
**What:** The Scan FAB becomes real.
**Do:** Camera QR scanner (`html5-qrcode` or BarcodeDetector with fallback),
vibrate/sound on success → resolves via #39 endpoint; manual code entry
fallback; torch toggle.
**Done when:** scans a printed label on a phone in < 2s.

### #44 — PWA item card (from scan)
**What:** Act on the scanned piece.
**Do:** Order number, garment, customer, current station, big
check-in/check-out buttons (calls #40), correction button (#45), item
history timeline.
**Done when:** an employee can work a piece phone-only.

### #45 — Correction UI
**What:** Rework without a desktop.
**Do:** Sheet from #44: pick target station, reason (required), submit
(#41); confirmation with what happens next.
**Done when:** correction reflects instantly in station queues.

### #46 — PWA my-station queue
**What:** Stations tab = worklist.
**Do:** Station picker (remembered), queue list from #42 (priority badges,
due dates, overdue red), tap → item card; background refetch.
**Done when:** sortable, fresh data, usable all day.

### #47 — Admin workflow board
**What:** Whole-shop view (Workflow sidebar module).
**Do:** Columns per station with item cards (order, garment, due, priority,
who's holding it), WIP limits display, drag optional (buttons fine), link to
order detail.
**Done when:** owner can see the entire floor state at a glance.

### #48 — Shared progress timeline component
**What:** One timeline used by admin detail, item card, customer view.
**Do:** Vertical timeline from process events (station entries/exits,
corrections, status changes); relative + absolute times.
**Done when:** renders real event data everywhere it's used.

## Milestone 11 — Billing (issues 49–54)
*Goal: money handled correctly.*

### #49 — Backend: rate card
**What:** Price list per garment/service.
**Do:** `features/billing/` pattern: rate CRUD (garment type, service,
price in paise), admin-only mutation later (#55).
**Done when:** rates manageable via API.

### #50 — Intake: quotation
**What:** Price shown at order creation.
**Do:** Compute quote client-side from rate card + items; store
`quotedAmountMinor` on order create; edit-able override with reason.
**Done when:** quote appears on review step + printed slip (#35).

### #51 — Backend: payments + invoice
**What:** Advance, balance, bill.
**Do:** Payments entity on order (amount minor, kind advance|balance,
method, received-by); endpoints record payments; invoice generation
(numbered `INV-…`, line items, totals) + `invoice.generated` event.
**Done when:** curl: quote → advance → balance → invoice JSON.

### #52 — Admin: payments UI
**What:** Money view on the order.
**Do:** Order detail payments section: record advance/balance dialogs,
paid/unpaid summary chip, payment history.
**Done when:** counter flow usable: quote → take advance at intake.

### #53 — Invoice print view
**What:** The bill the customer gets.
**Do:** Print-styled invoice (shop header, items, measurements summary
optional, totals, payments); A4 + 80mm variants; print + download PDF
(browser print-to-PDF acceptable).
**Done when:** prints cleanly on both sizes.

### #54 — Delivery flow
**What:** Close the loop.
**Do:** "Mark delivered" (guards: balance settled or override with reason),
confirm dialog, delivered event → final WhatsApp/email; materials return
check (#37) surfaced.
**Done when:** delivered order locks editing, customer notified (log line).

## Milestone 12 — Staff & roles (issues 55–57)
*Goal: the right people see the right things.*

### #55 — Backend: roles + guard
**What:** owner / counter / staff roles.
**Do:** Role field on Better Auth user (plugin or custom field + hook),
`requireRole("owner")` middleware variant; protect rate card + staff
endpoints.
**Done when:** staff token rejected on admin-only endpoint.

### #56 — Admin: staff page
**What:** Staff sidebar module.
**Do:** List staff (from auth users), change roles, deactivate; invite flow
(sign-up link or admin-created creds — simplest safe option).
**Done when:** owner manages roles from the UI.

### #57 — Gate admin panel + global search
**What:** Sidebar is owner/office only.
**Do:** `(admin)` guard by role (staff → redirected to PWA home);
topbar global search (orders by number, customers by phone/name).
**Done when:** role-based routing works; search returns deep links.

## Milestone 13 — Real notifications (issues 58–59)
*Goal: actual WhatsApp/email leave the building (needs provider decision —
see HANDOFF §8).*

### #58 — WhatsApp provider adapter
**What:** Replace the console adapter.
**Do:** Implement `WhatsAppSender` port with the chosen provider (Cloud API
recommended), template mapping per event, retry + failure logging, secrets
in env; keep console adapter selectable via env for dev.
**Done when:** real message delivered on `order.created` in a test.

### #59 — Email adapter + templates
**What:** Same for email.
**Do:** SMTP adapter (nodemailer), HTML/text templates bilingual if decided,
`notification.dispatch.failed` event on errors.
**Done when:** end-to-end email on status change; failures visible.

## Milestone 14 — Quality & closeout (issues 60–63)
*Goal: it's properly done, not just working.*

### #60 — Admin: events viewer
**What:** See the event stream (great for trust + debugging).
**Do:** Settings → Events: live-ish list from `/api/v1/events` with filters;
actor + payload displayed.
**Done when:** owner can verify "the customer got notified" themselves.

### #61 — E2E smoke test
**What:** The golden path never breaks silently.
**Do:** Playwright: sign-in → create customer → intake order → scan code →
check-in/out one station → record payment → deliver. Seed + run against
local backend in CI script (GitHub Actions optional).
**Done when:** green run locally, documented in README.

### #62 — Lighthouse + accessibility pass
**What:** Quality bar met.
**Do:** PWA category ≥ 90 on key routes, a11y audit (labels, contrast,
focus states, keyboard on admin), fix findings.
**Done when:** scores documented in PR with screenshots.

### #63 — Documentation closeout
**What:** Docs match reality.
**Do:** Update web README (screenshots, structure), root README status,
this backlog with ✅ per issue, note deviations you made and why.
**Done when:** a new developer could onboard from docs alone.

---

## Milestone 15 — The Owner's Day (open/close ritual) — ★ NORTH STAR
*This is the product's reason to exist, in the owner's own words: "when the
owner opens or closes the shop, they want to know what is highest priority,
what must be done today, how much got finished today — life made easy and
accountable." Build #64–#65 early: pull them forward immediately after
Milestone 5 (they only need existing orders data). #66–#69 build on later
milestones. Every screen in this milestone is judged by one question:
"can the owner act on it in 30 seconds on a phone?"*

### #64 — Backend: opening summary endpoint
**What:** The morning answer — what needs doing today, in priority order.
**Do:** `GET /api/v1/day/opening?date=`: orders due today + overdue
(flagged red, carried over), urgent/high first then earliest due; WIP
snapshot (orders per status); station load counts (from orders data for
now — enriched per-station after #42). Cache-friendly, one call.
**Done when:** one curl returns the full prioritized must-do list.
**Depends on:** nothing beyond existing orders v1.

### #65 — Opening screen ("Good morning")
**What:** The first thing the owner sees each day, on phone or desktop.
**Do:** PWA home becomes the opening view when visited before noon (time-
based default + manual toggle): "Due today (n)" · "Overdue (n)" ·
"Urgent (n)" with a single prioritized list (badges + red overdue), link
each item to order detail; admin dashboard embeds the same component.
**Done when:** the owner's morning routine is: open app → see the day.
**Depends on:** #64, #21/#24 (dashboard/home shells).

### #66 — Backend: closing summary endpoint
**What:** The evening answer — how much got finished, what slipped, what
was collected.
**Do:** `GET /api/v1/day/closing?date=` computed from the event stream +
orders: orders created / ready / delivered today; items completed per
station (needs #40 events); due-today-but-not-finished → slipped list
(auto-carried to tomorrow's opening); payments collected today (advances +
balances, needs #51); per-employee completion counts (actorId on events).
**Done when:** one curl gives the full day's account.
**Depends on:** #40 (station events), #51 (payments) for full richness —
ship an orders-only version first, enrich later.

### #67 — Closing screen + "Close the day"
**What:** The evening ritual, one screen, then done.
**Do:** Evening view: "Finished today" counts (delivered, ready, per
station), "Slipped (n)" with reasons + one-tap confirm to carry over,
"Collected today" money tally, "Pending balances" total. A **Close the
day** button that locks the summary into a day report.
**Done when:** closing the shop takes the owner under two minutes.
**Depends on:** #66.

### #68 — Day report persistence + owner summary message
**What:** Yesterday, on record.
**Do:** Persist each close as a `day_report` record (counts, slips,
collections, who closed); show the last close summary at the top of the
next morning's opening screen; send the owner a WhatsApp summary on close
(uses the notifications feature + its templates).
**Done when:** opening screen starts with "Yesterday: 12 finished, 2
slipped, ₹8,400 collected".
**Depends on:** #67, #58 (WhatsApp adapter for the message).

### #69 — Accountability view (who did what today)
**What:** "Accountable" made visible — per person.
**Do:** Admin panel (Workflow or Staff module): per-employee table for a
chosen day — items checked in/out per station, corrections raised,
orders taken (counter staff), payments received — all sourced from event
`actorId` (already recorded on every action; verify and backfill
coverage where missing).
**Done when:** the owner can answer "what did everyone do today?" in one
screen, from real data, not memory.

---

## Suggested GitHub flow

Turn each issue into a GitHub issue (title + body from here) or ask the
owner to bulk-create them — then work strictly in order; each milestone is
a demo-able checkpoint. If an issue depends on an undecided item (HANDOFF
§8), ask in that issue before coding around it.
