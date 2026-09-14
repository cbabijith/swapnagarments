# Swapna Garments — Flutter worker app

Native worker companion to the Next.js worker portal. Uses the **same deployed
website API and worker accounts**. The old `backend/` Hono service is not used.

## Run

Flutter 3.44.1 / Dart 3.12.1 were used for validation.

```sh
cd mobile
flutter pub get
flutter run -d <android-device-id>
```

The default API origin is
`https://swapna-garmentsweb-production.up.railway.app`. Sign in using an existing
worker account created by the owner. Owner accounts are rejected by this app.
No passwords, database credentials, or API secrets are bundled.

For another deployment:

```sh
flutter run --dart-define=API_BASE_URL=https://your-website.example
```

For the local Next.js server on an Android emulator:

```sh
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3000 --dart-define=API_ORIGIN=http://localhost:3000
```

`API_ORIGIN` must match the website's `APP_ORIGIN`. It defaults to the base URL's
origin. HTTP development connections are enabled only in debug/profile Android
manifests. Run the existing Next.js server with its normal database setup.

## Worker parity

- **My work:** urgent/due ordering from the server, queue totals, status/station
  filters, scroll pagination, refresh, exact scanned-piece filtering, materials,
  custom workflow stages, measurement confirmation guards and design references.
- **Work actions:** start, block with a required reason, resume and complete with
  confirmation. The server remains authoritative for assignments and transitions.
- **Calendar:** month navigation, today, due/completed counts, day filters, paginated
  day records and links to current tasks or immutable history details. Shop dates
  and completion times use India Standard Time regardless of the device timezone.
- **Scan:** native camera QR scanning, torch, permission fallback, manual printed
  codes and duplicate detection. Scanning reads assigned work; it never mutates it.
- **History:** debounced server search, station filter, date grouping, scroll
  pagination, customer contact, saved overview/measurements/design tabs and zoom.
- **Profile:** identity, availability, skills, queue capacity, server totals,
  current/recent work previews and session-revoking sign-out.

The green/cream visual system, serif headings, wordmark and worker navigation
follow the web portal. Geist and an OFL-licensed Libre Caslon serif are bundled
locally; Libre Caslon is the native substitute for the website's Georgia font.
The website's built-in garment illustrations are shared verbatim. Protected
uploaded images use the same scoped `work`/`history` authorization as the web.

## Structure

```text
lib/
  app/                 composition, theme, navigation, foreground refresh
  core/
    config/            compile-time API origin
    network/           Dio, secure cookie storage, structured failures
    events/            typed application events
    data/              bounded paging and JSON boundary helpers
  features/
    auth/              worker session and sign-in
    work/              queue, immutable command guards, work actions
    calendar/          month aggregates and day pages
    scan/              label validation, resolution, camera
    history/           completed stages and snapshots
    profile/           worker identity and overview
    piece_details/     shared measurements and authorized design images
  shared/              small visual widgets and date/label formatters
```

Each feature owns its domain, application/controllers, data repositories and
presentation. Riverpod 3 `Notifier`, `AsyncNotifier` and auto-disposed providers
manage state without code generation. Screen state is local; API state belongs in
providers, and widgets never call Dio directly. Source, tests and Dart tools must
remain **at most 300 lines per file**, checked by `tool/check_file_lengths.dart`.

## API contract

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST / DELETE | `/api/auth` | Shared sign-in/sign-out |
| GET | `/api/session` | Current worker identity |
| GET / POST | `/api/work` | Paginated assignments / work command |
| GET | `/api/work/calendar` | Month aggregates |
| GET | `/api/work/calendar/day` | Paginated due/completed records |
| GET | `/api/work/history` | Paginated/searchable history |
| GET | `/api/work/history/:id` | Immutable completion snapshot |
| GET | `/api/work/profile` | Current worker profile |
| GET | `/api/design-library/:id/image` | Scoped private design images |

The transport preserves `swapna_session` in platform secure storage, scoped by
API origin and expiry. It sends `Origin`, refuses absolute request URLs and does
not follow redirects. A 401 clears the local session and removes protected
navigation; 403/409/503 errors remain recoverable UI errors.

Commands send `{ mutationId, action }`, `Prefer: return=minimal`, the current
`expectedStation` and `expectedVersion`. Uncertain transport retries of the same
action retain their UUID while the controller is alive. Version guards and server
idempotency prevent duplicate transitions. Writes are not silently queued offline.

## Events and performance

Successful commands publish `WorkChanged`; active queue, calendar, history and
profile providers react through the event stream. `SessionExpired` returns to
sign-in. Foreground polling every 45 seconds and an app-resume refresh detect
changes made on other devices; the API currently exposes no live push stream.
Timers stop when backgrounded and subscriptions are disposed with their providers.
These are client events; durable server event delivery is owned by the website.

Lists use lazy slivers and 20-row server pages. Profile previews request only three
rows. Search is debounced 350 ms. Old reads are canceled and generation-checked;
refresh keeps existing rows and pagination removes duplicates. Requests have
bounded timeouts. Offscreen features and images dispose their requests. Thumbnails
are decoded at a bounded size; full images load only when opened. Fonts and built-in
artwork need no extra network requests. Frame-rate claims require profiling on the
actual target phone; they are not inferred from widget tests or build success.

## Verify and build

```sh
flutter pub get
dart format --output=none --set-exit-if-changed lib test tool
dart run tool/check_file_lengths.dart
flutter analyze --no-pub
flutter test --no-pub
flutter build apk --release --split-per-abi
```

On Windows, `powershell -File tool/verify.ps1` runs the formatting, line limit,
analysis and test checks together. Tests use an isolated fake HTTP adapter;
no real shop records are changed. Screenshots can be regenerated with:

```sh
flutter test test/widget_test.dart --dart-define=CAPTURE_SCREENSHOTS=true --update-goldens
```

Screenshots are saved under `build/qa/` at 320, 390 and 768 pixels. Coverage includes
session/cookie contracts, authorization, pagination races, refresh failures,
version-guarded commands, duplicate taps, retry UUIDs, measurement guards, QR
resolution, custom stages, dialog flows and protected-route cleanup.

Release APKs appear in `build/app/outputs/flutter-apk/`. Most modern Android phones
use `app-arm64-v8a-release.apk`; use the matching ABI for older phones/emulators.
The repository's existing Android debug signing configuration is retained for
these installable test builds. Configure your release keystore before store
publication. Distribution to a store is not part of this change.

Android debug and release builds and local tests are verified in this workspace.
Live authenticated worker flows, physical-camera/permission behavior, secure-store
relaunch and device frame timing still need a real device with a worker login.
The listed local emulators have missing AVD directories, so native runtime checks
could not run here. iOS/macOS camera permissions and Keychain entitlements are
configured; building/signing those targets requires macOS/Xcode and remains
unverified. The Flutter web target is not supported by this native cookie adapter;
use the existing Next.js worker website for browser access.
