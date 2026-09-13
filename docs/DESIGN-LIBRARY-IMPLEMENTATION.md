# Garment and design image library

Implemented September 13, 2026, from the [research and references](GARMENT-IMAGE-LIBRARY-RESEARCH.md). Deployment verification is recorded below after release.

## Using the feature

- Open **Settings → Image library** to browse 70 garment models and 80 design details. Search by name or common aliases, filter by category/family, save favourites, enlarge pictures, upload shop images, or archive/restore entries. Results are paginated and the image grid has its own bounded scroll area.
- In **Settings → Edit garment → Details**, choose a main image from the complete library or upload your own. Add up to four back/detail reference images. Automatic matching and existing explicit illustration choices remain supported. Duplicating a garment retains its resolved picture.
- In **Edit garment → Designs**, enable relevant design groups, choose up to 40 allowed images per group, and create up to 12 named design presets. Suggested groups depend on the garment model; trousers, skirts, blouses and shirts receive different starting options. The owner can adjust them to the work the shop offers.
- In **New order → Design & reference images**, apply a preset or select individual details, add up to four reference photos and design notes. This section is optional and separate from customer measurements. A sleeveless selection clears sleeve shape/cuff choices; the server also rejects that incompatible combination.
- Each piece retains its saved model, design labels, view, references and notes. Enlarging a saved image works after archive or catalogue replacement. Order details and printing include these saved choices. Old orders without new image snapshots continue rendering their original illustration system.

The image library is independent of the existing limit of 50 shop garment/service definitions. An illustration is not a sewing pattern or a measurement value. Suggested groups and owner-approved option lists do not constitute validation of every possible physical garment combination. Combined 3D previews, automatic pattern generation and interactive photo cropping are outside this release.

## Artwork and persistence

All 150 built-in SVGs are original code-native illustrations using the existing sage/terracotta palette. The [catalogue](GARMENT-IMAGE-CATALOGUE.json) lists every entry. Public assets live under `web/public/design-library/v1/`; the reproducible source is `web/scripts/generate-design-library.mjs`. Do not overwrite published artwork when changing the meaning of a design: give changed designs new permanent IDs/assets and preserve old files. The 22 existing numeric measurement guides stay separate.

Migration 6 adds nullable garment image/reference/configuration JSONB columns, a nullable piece design snapshot, and `sg_design_assets`. Built-in definitions are a static registry; the database stores their shop preferences and custom upload metadata. Private media keys never appear in browser API responses. Catalogue commands validate and canonicalize image references on the server; intake validates allowed groups/options and freezes their authoritative labels. Catalogue revision guards and existing atomic command retry receipts still apply.

Images use the existing private Railway bucket. Authenticated, origin-checked uploads accept still JPG/PNG/WebP files up to 8 MiB and 20 million decoded pixels. Signature and decoder validation precede storage; EXIF orientation is applied and metadata is removed. Sharp 0.35.4 produces a maximum 1200 × 1500 WebP and a 256 × 320 thumbnail. See [Sharp input limits](https://sharp.pixelplumbing.com/api-constructor/), [output metadata behavior](https://sharp.pixelplumbing.com/api-output/), and the [0.35.4 release](https://github.com/lovell/sharp/releases/tag/v0.35.4).

Each upload has a stable retry ID and immutable, checksum-qualified object keys. Both processed files must upload before a library row commits. A failed upload remains selectable for retry in the browser; retrying does not duplicate a saved image. Authenticated image routes serve recorded files with `private, no-store`, including archived files used by previous orders. Replacing an image means uploading a new image and changing the garment reference. The original file bytes and metadata are not retained.

Image preferences/uploads have independent transactions and revisions. Existing records, profiles, prices, customers, owner credentials and sessions are not rewritten by startup migration. No production storage-mode cutover is needed. UI/hooks/contracts/domain rules belong to `features/design-library`; services own transactions and persistence; external storage/processing stays in `integrations/storage`; API routes remain thin.

## Backups and interrupted uploads

Storage rollback/recutover includes garment image fields and piece snapshots and retains `sg_design_assets` independently. Full backups must include this table and the bucket objects. A workspace JSON export alone is not an image backup. Use this release's migration tools when these fields are present; old writers must not discard fields they cannot understand.

An operator maintenance command checks unrecorded uploads older than seven days:

```powershell
# Run from web/, with the intended database and bucket configuration.
node --conditions=react-server --import tsx scripts/design-image-maintenance.ts --check
```

After reviewing a check, `--delete-orphans` removes qualifying objects. It only considers this feature's strict `designs/1/upload-UUID/SHA256/(image|thumbnail).webp` paths. It takes the upload's advisory lock, rechecks the current database record and last-modified time, and keeps every recorded image, including archived images. No cleanup is scheduled automatically and no production cleanup was run for this release.

## Validation

- All 23 automated tests pass. Coverage includes 150 distinct local drawings, original-schema preservation, authentication before validation, pagination and aliases, upload processing/limits, interrupted storage/retries, stale preferences, canonical labels, immutable per-piece designs, archive behavior, rollback/recutover, and seven-day orphan cleanup using an isolated database and an in-memory S3 test adapter.
- Browser verification covers library search/favourites/archive/restore/enlarge, sample photo upload, garment image/configuration/preset saves, two-piece intake with reference photos, and preservation after image replacement/archive. Desktop, 390px and 320px flows have no horizontal overflow or browser errors. Saved reference enlargement and print layout were inspected.
- TypeScript, ESLint and the production Next.js build are release checks. Browser uploads use the isolated sample workspace; persistence/media transport logic uses isolated integration tests. Live deployment verification checks database/bucket connectivity, exact-commit deployment status, public SVG availability and unauthenticated route protection without creating shop test records.

## Deployment

Pending release verification.
