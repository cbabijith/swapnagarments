# Order creation, measurements and shop settings

Deployed to Railway on 13 September 2026. This implements the first release in [the research](ORDER-WORKFLOW-RESEARCH.md), plus profile history, quantities with individual overrides, phone matching and optional size presets. Code commit `43df3b06f3122b01e9769f31ab5f22a7000f8fec` is on `main` and `shahil`.

## Using it

1. Open **Settings → Garments**. Search the compact catalogue, then **Add garment** or **Edit**. The editor has **Details**, **Measurements** and **Size presets** tabs. Add or rename services, set an optional price, and configure numeric, text or choice fields with help and required flags. Apply each field or preset to the draft, then **Save garment**. Use **Settings → Order defaults** to set the starting garment and suggested delivery interval.
2. Open **New order**. Search by name or phone, or choose **Add new customer**. A search term carries into the name or phone field. New customers are created with the order's final save.
3. Choose garments. Their configured fields and price appear automatically. Compatible saved customer measurements fill in with their recorded date; review them before confirming. New customers start with blank dimensions. Shop size presets are applied only when selected.
4. Enter quantity, fabric/design notes and measurements. Duplicate a line or split a quantity to change individual pieces. **Add a measurement for this piece** adds a one-off dimension. Configure reusable dimensions in Settings. Each piece has its own saved measurement copy.
5. Confirm sizes for cutting. New garment profiles are selected for saving by default; existing saved profiles change only when their checkbox is selected. Only one line per garment can update that customer's profile in one order. One-off dimensions remain on the piece.
6. Set delivery, priority and any advance, then **Save order**. The customer, confirmed profiles, pieces and payment save in one transaction. Without confirmed sizes, the order saves with **Measurements pending**. Open the order to add/confirm sizes before advancing that piece.

Customer detail now offers separate garment profiles and their earlier versions. The order detail and **Print order** use each piece's saved measurements. Changes to customer profiles, prices, garment names or template fields never rewrite an existing piece's agreed record. Explicit piece edits at cutting retain the prior snapshot.

## Persistence and rules

- Migration 4 adds shop settings, garment definitions, customer profiles, piece snapshots/history, an optional-profile presence flag and durable command event identities. Existing owner/session data, legacy measurement maps, orders and payments are retained.
- Both relational and JSON storage support the new fields. Migration reconciliation includes catalogue and profile counts, historical snapshots and absent/empty profile arrays. No real shop database was used during this implementation's tests.
- Template and profile revision checks reject stale saves. Background refresh keeps entered values; reload actions are explicit. A unit change does not silently convert saved sizes. Presets must be removed and re-entered when changing units.
- Amounts remain integer paise. Quantities become separate tracked pieces, with at most 50 pieces per order. Advances cannot exceed the order total. Phone matching recognizes local and `+91` forms without rewriting existing stored numbers.
- A retry of the same intake request returns the same order. Customer/profile changes, payments, retry receipts and durable event records commit together. An injected final write failure rolls them all back.
- Existing garments are archived rather than deleted. Older pieces without measurement snapshots display that their original measurements were not recorded; today's customer profile is not presented as historical evidence.

## Verification

PostgreSQL/PGlite tests cover custom settings and size presets; atomic new-customer intake; duplicate requests and phone numbers; profile updates and stale conflicts; unchanged template versions after JSONB storage; pending measurement guards; authenticated endpoints; injected write failure; and lossless JSON/relational transitions. The complete suite also exercises the existing billing, workflow, export and migration behavior.

Browser checks use the sample workspace at 1440px desktop and 390px mobile. They cover inline customer creation, two pieces, a custom dimension, advance and balance, order detail, creating a garment/template/preset in Settings, and using those defaults on another order. Persisted database behavior is verified separately by the integration tests. Screenshots and run output are in `output/qa/`.

Final local validation: all 17 automated tests passed, TypeScript and ESLint passed,
the production build passed, and the browser run reported no page errors or mobile
horizontal overflow. The pending-piece browser check also confirmed sizes and
advanced that piece successfully afterward.

## Settings interface update — 13 September 2026

Settings now shows one section at a time: Garments, Order defaults, Account or Daily reports. The catalogue has name search, active/archived filters and seven-item pagination; reports load only when opened. Each garment has a compact row with price, measurement count and edit actions. Its menu supports duplication, reordering, archiving and restoring.

Focused dialogs replace the long inline forms. Their header and Save/Cancel actions stay visible while the active content scrolls. Field and preset lists open one editor at a time, support removal with Undo, and keep changes in a garment draft until saved. New garments can copy an existing template. Unsaved dismissal requires an explicit discard; preview values do not get saved or block validation. Default garments cannot be archived, saved field types remain protected, and unit changes explain when presets must be re-entered. Stale saves and ambiguous retries retain the existing revision and command-ID protections.

This is a UI change using the existing settings command and schema; it adds no database migration. Browser verification covers add/edit of numeric, text and choice fields; preset validation and reuse; remove/undo; duplicate/archive/restore/reorder; pagination; template copying; default editing; keyboard tabs; and creating a confirmed sample order from the new settings. Layouts were inspected at 1440px, 390px and 320px, with no horizontal overflow or dialogs outside the viewport. Results and screenshots are retained in `output/qa/settings-ui-results.json` and `output/qa/settings-*.png`.

## Later work from the research

Automatic draft recovery across a browser refresh, repeating a previous order, favourites, multiple wearers under one contact, retail stock, design uploads and external messaging remain later releases. The event table stores durable identities; it does not send notifications or implement a dispatch worker. The financial CSV remains an order/billing export; complete piece measurements are available on the order and its printed work card.

Use this release's storage tools for any rollback and retain an application that understands the new fields while continuing shop writes. This release did not switch the existing storage model.

## Production verification

Railway deployment `ceb19c92-75ba-4466-a2db-07ed0c45f484` succeeded for the exact code commit above. Verified at `2026-09-13T02:33:00Z` (08:03 IST). The [live website](https://swapna-garmentsweb-production.up.railway.app) returned 200 for all seven checked screens, including New Order and Settings. Health reports both PostgreSQL and bucket connected.

The new settings and measurement routes require sign-in and return `Cache-Control: no-store`. Their authentication handlers complete `ensureSchema` before returning 401, verifying the migration path ran without error on the deployed app. Existing owner setup remains closed. These were anonymous production checks; no customer, measurement or order test records were written to the real shop. Detailed results are retained locally in `output/qa/production-release.json`.
