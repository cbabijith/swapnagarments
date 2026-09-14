# Worker mobile interface

Deployed and verified on Railway on 2026-09-14. Code commit
`08929ffdfb3bf48008f67eec9ea07a9a8f3ed357` is active through deployment
`6f1ef726-6cc0-4fb7-adf8-2f6045c172ab` on the
[worker website](https://swapna-garmentsweb-production.up.railway.app/my-work).

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

The production build, TypeScript checks, full ESLint checks, and all 36 web
tests passed. Browser verification used synthetic API
responses against a local production server; no live shop records were changed.

`output/qa/worker-mobile-browser.cjs` covers 320, 360, 390, 430, 768, and 1440px
queue layouts, phone history/profile/scan layouts, landscape overflow, touch
targets, filters, measurement expansion, cancelling completion, starting work,
history detail navigation, error recovery, printed-code lookup, and sign out.
Results are recorded in `output/qa/worker-mobile-results.json` with screenshots
alongside it. Camera hardware and the on-screen keyboard were not exercised.

Live verification is recorded in `output/qa/worker-mobile-production-release.json`.
Railway reports the release active and successful. All 14 referenced application
assets loaded, including the new mobile styles and queue controls. The worker
pages returned HTTP 200; protected APIs returned HTTP 401 with no-store caching.
Database and image storage health were connected, and owner setup stayed closed.
No production business commands were submitted during verification.

The browser script defaults to `http://localhost:3118`; set `WORKER_TEST_URL` to
test another local production server. Its Playwright import uses the same bundled
Windows runtime as the existing browser QA scripts.

## Centered scan navigation — September 14

Worker navigation now reads **My work, Calendar, Scan piece, History, Profile**.
Scan piece occupies the center of five equal columns at every width. On phones,
it uses the same raised green 46×42px icon treatment as the admin scan control,
with a readable label and an accessible link target of at least 48px in height.
The active scan icon uses a darker green; other tabs retain their selected state.

Verified with synthetic worker data at 320, 390, 768 and 1440px: centered position,
no horizontal overflow, correct scan route/selected state, and no browser console
errors. Production build, TypeScript and targeted ESLint passed. The scanner's
camera and work-resolution behavior are unchanged.

Release status: verified locally; publication pending.
