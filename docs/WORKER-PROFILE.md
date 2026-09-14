# Worker profile and personal work overview

Implemented locally on `shahil`, September 14, 2026. This addition has not been
deployed as part of the profile task.

Workers can open **Profile** from the bottom navigation, their name in the
header, or **View profile** above the My work queue. The profile shows their
name, login email, role, station skills, availability, and estimated queue
capacity. The owner continues to manage these details and account settings.

The profile also displays current assignment totals (pending, in progress,
blocked, and overdue), up to three current pieces with links to their tasks,
and up to three recent completed stages with the total recorded completion
count. **View all** opens My work; **View history** opens the existing searchable
work-history screen. Completion totals count stages, not distinct garments.

## Implementation

- `/my-work/profile` composes feature-owned UI in
  `web/src/features/team/components/worker-profile.tsx`.
- `/api/work/profile` authenticates the session and calls
  `web/src/services/worker-profile-service.ts`. The service looks up only the
  authenticated worker's staff ID and explicitly selects the public profile
  fields. Request parameters cannot select another person.
- Existing worker-scoped work and history queries supply bounded previews and
  server-computed totals. The shared feature transport refreshes after commands,
  on focus, and every 30 seconds while the page is visible.
- No profile schema migration or account mutation is introduced. Profile reads
  support both relational storage and the existing JSON rollback representation.
  The completed-work panel consumes the separate work-history implementation.

## Verification

- Web production build, TypeScript, and ESLint pass.
- Seven focused tests pass across profile, team, work history, and architecture.
  The profile integration test uses isolated PostgreSQL WASM and covers sign-in,
  rejection of unsigned/owner requests, identity tampering, limited response
  fields, live profile updates, deactivation, and JSON/relational transitions.
- Browser checks use the production build with synthetic API fixtures; they do
  not access or modify the production database. Screens fit 1440px, 390px, and
  320px. Task links, history navigation/search, profile navigation, long identity
  values, unavailable status, empty states, and retry after a failed profile
  request pass with no browser page errors.
- Local screenshots and the browser report are retained in
  `output/qa/worker-profile-*.png` and
  `output/qa/worker-profile-browser-results.json` outside source control.
