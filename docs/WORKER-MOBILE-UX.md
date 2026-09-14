# Worker mobile interface

Implemented locally on 2026-09-14. This change has not been deployed.

- The work queue opens with a compact greeting and scan shortcut. Personal
  details live on the Profile tab instead of repeating above the assignments.
- A single row of counters and four status buttons reduce scrolling. Station
  filtering, refresh, and clearing an empty filter remain available.
- Work cards use larger text, expandable measurements, and a full-width primary
  action. Unconfirmed measurements explain why work cannot start.
- The four-item bottom navigation and notifications account for phone safe areas.
  Mobile controls are at least 44px tall; text inputs and selects use 16px text.
- History cards, profile details, scan entry, and confirmation dialogs use phone
  spacing. Sign out is available at the top of Profile, including when its data
  request fails.

Worker styling is scoped in `worker-shell.module.css`. The shared owner queue
retains its status selector and assignment controls. Work updates continue through
the existing service and confirmation flows.

## Verification

The production build, TypeScript checks, targeted ESLint checks, and the team,
profile, and history tests passed. Browser verification used synthetic API
responses against a local production server; no live shop records were changed.

`output/qa/worker-mobile-browser.cjs` covers 320, 360, 390, 430, 768, and 1440px
queue layouts, phone history/profile/scan layouts, landscape overflow, touch
targets, filters, measurement expansion, cancelling completion, starting work,
history detail navigation, error recovery, printed-code lookup, and sign out.
Results are recorded in `output/qa/worker-mobile-results.json` with screenshots
alongside it. Camera hardware and the on-screen keyboard were not exercised.

The browser script defaults to `http://localhost:3118`; set `WORKER_TEST_URL` to
test another local production server. Its Playwright import uses the same bundled
Windows runtime as the existing browser QA scripts.
