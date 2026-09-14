# Worker profile interface

The profile presents the worker's name, role, login email and availability once in
one identity card. Work overview links show full assigned and completed totals
from the server and open the queue or history. Skills use readable tags; queue
capacity is shown in hours and minutes with its meaning explained.

Current and completed work previews expand on demand, keeping the initial profile
short on phones. The previews retain status counters, overdue information, garment
links and completed-stage details. Sign out sits below the profile, remains
available during profile errors, prevents repeated taps while pending, and handles
network failures with a retryable message. A server failure uses the existing
dismissible notification.

Availability and account details remain managed by the shop owner. No worker
editing controls, service changes, schema changes or permission changes were added.

On the profile screen, the top profile icon opens the existing account menu with
Sign out. From other worker screens it remains a link to Profile. Escape closes
the menu and returns focus to the icon; leaving Profile resets the menu.
`output/qa/profile-account-menu-browser.cjs` verifies this behavior at 320, 390 and
1440px, including sign-out failure/retry and prevention of repeated taps. The
production build and focused worker-shell ESLint check passed.

The menu change (`68bb034`) was deployed on 2026-09-14 and verified on the live
site in release `e56dea26de626e3783b4b09bff0bfae9373c0dfe`, Railway deployment
`b2d9665b-4fd8-47e1-a789-eead8ce7e71b`. All menu checks passed using synthetic API
responses without changing a real account; site, database and bucket health were
healthy. See `output/qa/profile-account-menu-live-results.json` and the matching
phone and desktop screenshots.

## Verification

- Production build and full ESLint passed in an isolated checkout using the
  committed npm lockfile; all 38 web tests passed.
- The final production build includes the latest deployed queue changes and was
  checked at 320, 360, 390, 430, 768 and 1440px.
- `output/qa/profile-ui-browser.cjs` verifies full totals despite three-entry
  previews, expandable sections using the keyboard, navigation, availability,
  capacity, long account details, empty skills, query failures and recovery,
  empty/loading/missing profiles, touch targets and sign-out recovery.
- Synthetic API fixtures are used for browser checks. No live shop records or
  accounts were changed. Results are in `output/qa/profile-ui-results.json` and
  screenshots are stored alongside it as `profile-ui-*.png`.
- The script defaults to localhost port 3119; set `WORKER_TEST_URL` for another
  local production server. It uses the bundled Playwright runtime like the
  existing worker QA scripts.

## Deployment

Deployed and verified on 2026-09-14 at
https://swapna-garmentsweb-production.up.railway.app/my-work/profile.
Commit `d5736e22c6ba37dc7e62a049b92d6b4029e33128` is active through Railway
deployment `a54c18c8-fabd-48a5-bb27-6c2686bc9f80`. Railway reports successful
deployment. Live health reports the database and image bucket connected; worker
pages return 200 and protected APIs return 401. All 14 referenced assets load,
including the new profile overview, previews, capacity copy and sign-out state.
Owner setup remains closed. Read-only release evidence is recorded in
`output/qa/profile-ui-production-release.json`.
