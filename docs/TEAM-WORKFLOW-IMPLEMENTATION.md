# Team accounts, work assignment, and scanning

Implemented in the active Next.js application on `shahil`, September 13, 2026.
This change is deployed to Railway and verified in production. Local workflow
and permission checks also passed; release evidence appears below.

## Research and product decisions

The implementation uses a piece's **current station** as the unit of work. A
three-piece order can be shared among workers, while each individual piece has
one responsible worker at its current station. Completing the stage releases
that responsibility and makes the next stage available. Future stages are not
assigned before their predecessors finish.

| Reference | What it supports | Decision for Swapna |
| --- | --- | --- |
| [ERPNext assignment rules](https://docs.frappe.io/erpnext/assignment-rule) | Round robin and assigning to the least-loaded eligible user are established assignment patterns. | Offer equal unfinished-piece counts and estimated-effort balancing. Neither method reshuffles existing work. |
| [Odoo work centers](https://www.odoo.com/documentation/18.0/applications/inventory_and_mrp/manufacturing/advanced_configuration/using_work_centers.html) | Work-center capacity and allowed employees constrain manufacturing assignments. | Require matching station skills, an active account, and availability. Optionally enforce each worker's queue capacity. |
| [Odoo Shop Floor](https://www.odoo.com/documentation/19.0/applications/inventory_and_mrp/manufacturing/shop_floor/shop_floor_overview.html) | Operators have a view of their own assigned work orders. | Worker sign-in opens a focused My work screen, with pending, in-progress, blocked, and overdue counts. |
| [ZXing browser API](https://github.com/zxing-js/browser/blob/master/README.md) | Browser camera decoding and scanner controls support QR workflows. | Reuse the installed QR reader with rear-camera preference, duplicate-scan suppression, and cleanup when closing or leaving the scanner. |
| [MDN camera access](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia) | Camera access requires permission and a secure context. | Offer printed-code entry and keyboard-wedge handheld readers as alternatives; camera failures leave the manual input available. |

The following are application decisions, not guarantees from those sources:
urgent orders precede high and normal priority, then earlier due dates; a more
specialized eligible worker wins an equal-load tie. Skill and availability
restrictions can prevent a mathematically equal split, which is preferable to
giving work to someone who cannot perform it.

## Using the feature

1. Open **Team → Add member**. Enter a name, a unique login email, and a password
   of at least 12 characters. Choose one work type or multiple station skills.
   Set availability and queue capacity. The owner account is preserved separately.
2. In **Work assignments**, use **Assign / Reassign** to select a qualified worker.
   The picker shows current estimated load and marks full queues. Use **Hold
   unassigned** for a piece that should stay under manual control.
   The September 14 update also adds **Assign work /
   Reassign work** to order details beside each pending garment at a production
   station, using the same picker. Confirm measurements first when they are
   pending. **View work** opens the assigned piece's task. Production build,
   TypeScript, lint, and five team/workflow tests pass; browser checks cover the
   picker, manual hold and activity refresh, and 390px/1440px action layouts.
3. Use **Distribute waiting work** for a one-time assignment pass. Switch on
   **Auto-assign** to distribute unassigned eligible work whenever shop commands
   create or release work. Existing assignments, started work, blocked work,
   manual holds, and pieces awaiting measurements are preserved or skipped.
4. Open **Rules** to choose equal piece counts or estimated effort and toggle
   capacity enforcement. Effort means assigned estimated minutes divided by the
   worker's queue capacity. Default station estimates are 30, 15, 60, 90, and 15
   minutes for Cutting, Sizing, Handloom, Stitching, and Ironing respectively.
   These are editable starting assumptions, not measured production standards.
5. A worker signs in at the same website using the account created by the owner.
   **My work** shows only that worker's current tasks, garment information,
   measurement snapshots, design references, priority, and due date. They can
   start, block with a reason, resume, and explicitly confirm stage completion.
6. **Scan a piece** accepts existing `swapna:<order-id>:<piece-id>` QR labels or
   a printed order number. Exact QR lookup verifies both the order and piece.
   Scanning only opens work; it never starts or completes a stage. A worker
   cannot use a label to access someone else's task. Owner lookup can still open
   completed orders. Workflow cards show assignee/status and link to the task.

Queue capacity limits estimated **unfinished work assigned at once**, not daily
hours worked. It does not reset at midnight. Unavailable workers retain their
queue and cannot start new work until marked available; they can finish or
resume work already underway. Deactivation immediately revokes login, releases
pending assignments, and retains started/blocked pieces for the owner to finish.
Removing a needed skill while a member has started work is rejected.

## Architecture and persistence

- Feature contracts, pure assignment rules, queries, and UI live in
  `web/src/features/team/`. Preview and live commands use the same pure rules.
- Thin `/api/team`, `/api/work`, and session routes authenticate and validate
  input. Server services enforce eligibility, capacity, ownership, and transitions
  against the locked workspace. Worker responses contain no customer contacts,
  customer notes, prices, payments, or credential material.
- The owner-only APIs remain protected, including the compatibility workspace
  command endpoint. Worker commands are restricted to `work.update`. Reference
  image access is limited to images saved on a piece assigned to that worker.
- Worker credentials use the existing salted password hashing and opaque hashed
  session-token scheme. Password changes, login-email changes, and deactivation
  revoke existing worker sessions. Retry fingerprints also use password hashing
  for password-bearing commands to avoid a fast password-verification oracle.
- Migration **7** is additive: optional worker and piece-work JSONB columns,
  assignment settings, worker accounts/sessions, and an assignee lookup index.
  It does not alter existing owner credentials, orders, payments, or storage mode.
- Commands commit state, activity, retry receipts, and durable event identities
  in one transaction. Stage completion also records structured workflow history.
  Worker retries bind the request fingerprint to the worker ID. Version and
  station guards reject stale or duplicate state transitions.
- The command coordinator continues to hydrate shop state for writes, as before.
  New operational reads filter and page in PostgreSQL; directory loads and queue
  totals are aggregated on the server. Automatic assignment is an atomic workflow
  rule, not a background notification consumer. No outbound messages are sent.
- Current JSON rollback and relational recutover retain worker profiles, task
  state, settings, and separate authentication records. Use the current
  application version for storage rollback. Do not deploy an older binary after
  creating worker accounts or assignments; older code does not preserve these
  fields when materializing storage.

## Validation

- Active web production build, TypeScript, and ESLint passed.
- All **29** current automated tests passed. New coverage checks skills, fair
  piece/effort assignment, capacity, availability, priority, manual holds,
  blocked transitions, stage handoff, worker sign-in, API ownership, filtered QR
  lookup, image authorization failures, retries, deactivation, password rotation,
  history, and JSON rollback/recutover. Existing owner and data-preservation tests
  continue to pass. Tests use isolated PostgreSQL WASM fixtures, never Railway.
- A separate local PostgreSQL instance and browser session verified account
  creation with multiple skills, assignment rules, manual reassignment, worker
  sign-in, start/block/resume/complete, and exact printed QR-code resolution.
  The worker saw only their assigned piece, and completion removed it from their
  queue. No browser error logs appeared in that worker flow.
- Team and worker layouts fit the **390px mobile** viewport; the Team screen
  also passed a **1440px desktop** check without horizontal overflow. The user's
  existing dev server was retained.
- The historical, unused Hono backend build could not run in this installation
  because its `hono`, `better-auth`, and related dependencies are absent. The
  active website build is independent and passed; no backend code was changed.

Real camera hardware and permission behavior still need a phone test over HTTPS
(or localhost). Browser testing exercised the printed QR payload through the
manual/handheld input. No camera hardware success is claimed. Automatic shift
schedules, payroll, actual-time tracking, email invitations, and outbound worker
notifications are outside this implementation. The worker queue refreshes every
30 seconds and on focus/visibility changes, matching the existing application.

## Release

Before a production release, use the normal verified `shahil` → `main` process
and database backup procedure. Migration 7 runs through the existing versioned
startup migration runner. Existing team directory entries remain intact; the
owner can use **Set up account** on an old worker entry. Automatic assignment
defaults to off until the owner enables it or runs a distribution pass.

## Production verification

Code commit `601a6faf40f50433c85dc021e8b1d1f584e82f67` was released from `shahil`
to `main` through Railway deployment `03b2d0e7-2ec8-4d50-9e0a-e1359ce237cf`.
Railway reported success for that exact commit. Verification completed at
`2026-09-13T08:38:36.019Z` on the
[live website](https://swapna-garmentsweb-production.up.railway.app).

All 11 checked pages, including Team, My work, and Scan, returned HTTP 200.
The 14 JavaScript/CSS assets referenced by those three pages also loaded.
PostgreSQL and the private image bucket reported connected. Eight protected
reads and unsigned Team/Work commands returned 401 with `Cache-Control: no-store`.
Those authentication handlers completed schema initialization successfully,
and existing owner setup remained closed.

These production checks created no worker accounts, customer/order records,
assignments, or uploads and made no storage-mode changes. Signed-in task behavior
was verified in the isolated local environment described above; a real phone
camera test remains outstanding. The local verification report is retained at
`output/qa/team-workflow-production-release.json` outside source control.
