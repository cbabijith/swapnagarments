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

Live release verification will be recorded in
`output/qa/profile-ui-production-release.json`.
