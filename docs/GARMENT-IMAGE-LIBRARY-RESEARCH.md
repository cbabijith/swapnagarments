# Garment and design image library for Swapna Garments

**Implementation follow-up:** The 150-entry library and upload/design workflow have now been implemented. See [implementation, limits and release verification](DESIGN-LIBRARY-IMPLEMENTATION.md). The research below records the application state and recommendations before implementation.

Swapna Garments should expand its current illustrations into a searchable library of garment models and design details, with a way to add the shop's own pictures. A practical initial scope is **70 garment models and 80 design choices**, supported by front or back views where the distinction matters. The accompanying [150-entry catalogue](GARMENT-IMAGE-CATALOGUE.json) defines this proposed scope. Its entries describe artwork to prepare; they are not downloaded pictures or features already installed in the live application.

The recommended source is an expanded set of original vector illustrations matching the current website, supplemented by shop-owned photos and sketches. This gives common choices a consistent appearance and makes unusual designs possible without waiting for a software release. Third-party libraries can fill specific gaps after checking both visual suitability and the applicable permission to use their artwork in a selectable library.

## Current application and the coverage gap

The current implementation contains 12 garment illustrations and 22 measurement guides. The garment library is a fixed list in `web/src/features/settings/contracts/garment-illustration.ts`; its SVG drawings are in `components/garment-illustration.tsx`. Adding a new garment name in Settings does not create a new drawing. Automatic matching recognizes a limited set of names and otherwise uses the general service image.

The current image appears in catalogue rows, garment selection, customer measurement buttons and saved order views. New piece snapshots retain the chosen illustration. These are useful foundations for expansion: stable identity, consistent rendering and preservation of the image attached to an agreed order already exist.

Three separate extensions are needed. The built-in artwork needs broader coverage; the library needs categories and search for more than a small grid; and the data model needs explicit design choices and custom image references. The current Railway storage adapter creates an S3 client and checks bucket health, but does not implement image upload, processing, metadata or authenticated delivery routes. The catalogue contract also caps shop garment definitions at 50. An image library containing hundreds of entries must be independent of that shop product list.

“All images” should mean that the shop can represent any garment it accepts, using either a relevant library drawing or its own reference. Fashion styles and combinations remain open-ended. Completion therefore needs broad initial coverage plus an expandable system, with a useful fallback when a particular drawing is missing.

## What established systems demonstrate

| Reference | Evidence from its published material | Application to Swapna Garments |
| --- | --- | --- |
| Fashion Dot | Its plan catalogue separates 127 garment models across seven categories from 56 design options, including front/back necklines, sleeves, collars and darts.[^1] | Keep the garment silhouette and individual style choices as related but separate records. |
| Fashion Dot Max | The product describes saving custom designs alongside its built-in patterns.[^2] | A shop must be able to extend a supplied catalogue. Its CAD patterns are a workflow reference, not an image licence for this website. |
| Tailornova | Its feature page describes intermixable templates, adjustable lengths and downloadable vector flat sketches.[^3] | Reusable visual components can cover multiple designs. Building a complete pattern generator would be a separate project. |
| eShakti | A product page exposes neckline, sleeve and length customization alongside size selection. The same page says orders are suspended during restructuring.[^4] | This is an interface example for separating fit and style, not a recommendation to purchase from the service. |

These sources support a modular catalogue. They do not establish a universal list of garments or grant permission to copy their drawings. Vendor feature descriptions were used as published evidence; proprietary CAD systems were not purchased or independently tested. Tailornova's page also labels some 3D and integration features as forthcoming, so this report does not assume those capabilities are available through an integration.

A blouse illustrates the benefit. The base item can be a princess-seam blouse, while its front neckline, back opening, sleeve shape and closure remain separate selections. Twelve necklines, twelve sleeve shapes and ten backs would already create 1,440 theoretical combinations before lengths or closures are considered. That arithmetic is illustrative; many combinations need compatibility rules and tailoring review. Producing a separate complete picture for every combination would create unnecessary artwork and maintenance.

## Four kinds of images

| Image purpose | What it communicates | Where it belongs |
| --- | --- | --- |
| Garment model | The overall item or construction family: shirt, blouse, anarkali, lehenga or uniform | Product catalogue and garment chooser |
| Design detail | A specific choice: boat neck, keyhole back, puff sleeve, collar or pocket | An optional design section for that garment |
| Measurement guide | Where and how to place the tape for a numeric value | Beside the relevant measurement field |
| Shop or order reference | The actual sample, fabric detail, embroidery or unusual requested design | Reusable shop library or the individual order |

A neckline illustration must not supply a neck-depth measurement. Choosing a garment picture must not invent a customer's size. The existing numeric measurement guides should continue explaining measurement methods independently of these style choices.

The same distinction matters when reusing customer data. A saved bust value can be appropriate for the next blouse, while the previous blouse's open back may be inappropriate. Reuse compatible measurements through the existing profile flow. Reuse a design only through an explicit action such as **Use previous design** or **Apply design preset**.

## Proposed initial coverage

The following counts are a recommended delivery scope, chosen for this shop-management application. They are not claims about an industry's standard catalogue size. The full names and stable proposed IDs are in [GARMENT-IMAGE-CATALOGUE.json](GARMENT-IMAGE-CATALOGUE.json).

| Garment family | Entries | Examples and purpose |
| --- | ---: | --- |
| Blouses and traditional wear | 10 | Saree blouse constructions, choli, pavada/davani, pattu pavadai and saree |
| Kurtas and salwar sets | 10 | Straight, A-line, anarkali, angrakha and panelled kurtas; complete salwar/churidar/sharara sets |
| Bottoms | 10 | Trousers, churidar and salwar bottoms, patiala, palazzo, sharara, gharara, dhoti pants, leggings and shorts |
| Skirts and dresses | 12 | Straight/circular/pleated/wrap skirts, petticoat, lehenga, common dress silhouettes, gown and jumpsuit |
| Menswear and unisex garments | 10 | Shirt, T-shirt, polo, kurta set, sherwani, jackets, waistcoat, blazer, dhoti/mundu and suit |
| Modest wear and homewear | 6 | Abaya, kaftan, nightdress, pyjama set, robe and maternity dress |
| Children's garments | 5 | Frock, pinafore, romper, kurta set and lehenga set; other families can also carry a children tag |
| Uniforms and services | 7 | Uniform shirt/trousers, scrubs, lab coat, chef coat, alteration and general service |
| **Garment models** | **70** | Shared library entries; installing them should not create 70 active shop products |

| Design group | Entries | Coverage |
| --- | ---: | --- |
| Front neckline | 12 | Round, U, V, boat, square, sweetheart and other common outlines |
| Back design | 10 | Closed outlines, keyhole/teardrop openings, racerback, straps and open back |
| Sleeve shape | 12 | Straight, puff, bell, cap, petal, flutter, bishop, lantern, raglan, batwing, ruffle and layered |
| Sleeve length | 5 | Sleeveless, short, elbow, three-quarter and full |
| Collar and lapel | 8 | Collarless, shirt, Mandarin, Peter Pan, shawl, notched lapel, sailor and tie neck |
| Closure | 8 | Button placements, zip placements, hooks, dori, wrap tie and pull-on |
| Hem | 8 | Straight, curved, high-low, asymmetric, slit, scalloped, ruffled and banded |
| Cut and construction | 8 | Straight/A-line, princess seams, darts, panels, gathers, pleats and wrap |
| Pocket | 6 | No pocket plus patch, side seam, welt, flap and kangaroo |
| Cuff | 3 | Plain, button and French |
| **Design choices** | **80** | Only relevant groups appear for a selected garment |

Some entries need more than one view, so 150 library entries may require more than 150 image files. A back-design entry needs a back view. A sleeve entry needs a close-up that remains recognizable on a phone. “No pocket” and “sleeveless” need clear illustrated states; they also need to remain distinct from an unselected option.

Families are navigation aids. Audience and use should be separate tags so that a shirt can appear under menswear, womenswear, children or uniforms without duplicating its artwork unnecessarily. Aliases should cover familiar spellings such as kurta/kurtha/kurti and saree/sari. Regional-language display names can be added as shop-verified labels while permanent IDs remain unchanged.

## Where the artwork can come from

| Source route | What it offers | Assessment for this application |
| --- | --- | --- |
| Original SVG illustrations | Extend the 12 existing drawings with one consistent visual system | **Recommended for the built-in library.** Each shape and label can be reviewed for the actual tailoring meaning. |
| Shop-owned images | Photos of samples, the shop's own work, sketches and custom designs | **Recommended as the expansion path.** Supports new styles immediately after an upload and review. |
| SVG Repo | A searchable catalogue carrying several different licences | Useful for individually checked gaps. Check each asset's stated licence and source; the whole site is not uniformly CC0.[^5] |
| Flaticon | Garment icons are available, including a saree example with attribution terms | Useful for visual exploration, but a normal download licence must not be assumed to cover an embedded image-selection library.[^6][^7] |
| Noun Project | An API with SVG/PNG, metadata, search and visual-style matching | A possible later provider integration. It adds account, licence and usage management, and garment-detail coverage still needs an asset-by-asset check.[^8][^9] |
| FashionDesign411 / Designers Nexus | Garment flat sketches organized by apparel category | Relevant technical drawing references. Their terms restrict redistribution, so do not import their downloadable files into the app's library under an assumed permission.[^10][^11] |

The selected sources do not establish a complete, consistently styled, freely reusable pack covering this entire proposed inventory. A provider may have many millions of general icons while still lacking a usable distinction between a particular blouse back, sleeve construction or regional garment. Search-result volume is therefore a poor acceptance measure. The required check is whether each requested entry has a clear, accurate, appropriately licensed image.

Flaticon's published terms include restrictions on incorporating its content into products or services offering icons or images and on redistribution. This makes the intended library use materially different from displaying a single icon on a page. A provider arrangement explicitly covering that use would need to be established before adopting it. This report does not treat changing colours or adding attribution as resolving that separate restriction.[^6]

For any licensed supplement, retain the original source page, creator, licence or purchase record and allowed uses with the asset metadata. Avoid exposing an asset-download catalogue unless its rights cover that activity. For the original library, keep editable source files and immutable exported versions. For shop uploads, record whether a picture is reusable shop material or an order-specific reference so it is not silently promoted into a shared catalogue.

AI-generated artwork could assist preparation of draft illustrations. It should be a reviewed content-production step, with checks for the correct view, opening, seams and consistent visual style. It should not run during routine order entry or determine measurement values. A simple original flat drawing is sufficient for recognizing most catalogue choices; fabric texture and detailed embroidery are better represented by a separate reference photo.

## Recommended interaction

**Settings library.** Keep the existing compact Garments screen. Add a **Manage images and designs** action that opens a dedicated view with Library, My images and Favourites filters. Search should understand aliases and tags. The default view should show frequently used choices, with categories available for browsing. New content belongs in this focused view rather than a long sequence of forms on the Settings landing page.

**Assigning a garment image.** The current **Change image** control should open a searchable chooser with **Library** and **Upload image** routes. Selecting a library item previews it next to the product name. Uploading opens one short flow: choose a file, rotate/crop if needed, name it, select front/back/detail, then use it. It should be possible to keep the current picture when cancelling. Failed uploads should retain the garment draft and explain what needs retrying.

**Configuring details.** Each shop garment enables the applicable design groups. A blouse could enable front neck, back, sleeve, length and closure; trousers could enable pockets, cut, closure and hem. Each group contains approved choices and an optional preset. Adding a new custom choice must be possible from the library without changing application code.

**Creating an order.** First choose the shop garment, then optionally expand **Design details**. Show only the enabled groups. Each group opens one image chooser at a time, with a larger preview before selection where front/back details could be confused. Keep the current design summary visible as short labelled choices and thumbnails. Changing the highlighted option should not reset unrelated measurements or the entered price.

**Saving and printing.** The order should retain the selected labels, image versions, relevant written instructions and front/back references. Print the agreed details on the work card alongside the piece's measurement snapshot. Show an explicit unselected state where a design decision remains open. A missing upload should fall back to the saved label and base garment drawing, while allowing the operator to retry loading it.

For accessibility, image buttons need accessible names describing the choice or action. When the same label is already present in the button, a decorative image should avoid a redundant screen-reader announcement. W3C's functional-image guidance supports this distinction.[^14] Use native buttons or radios, visible selection and focus, keyboard dismissal and focus return. A practical layout target is two columns on small phones and four on desktop, with bounded pagination; these are proposed design choices to verify, not universal usability measurements.

## Artwork production and acceptance

Use the existing muted green and warm accent palette for the built-in series. Set a common view box, stroke scale and garment baseline. Keep the distinguishing construction visible: a sharara needs an identifiable flare, a gharara needs its characteristic lower-leg transition, and a back keyhole must appear on a labelled back view. A colour change alone should not count as a new garment illustration.

Prepare a gallery proof for all 150 entries, inspect thumbnails at actual mobile size, and inspect important details enlarged. Review culturally specific names and silhouettes with the shop's tailoring knowledge before enabling them. Where a design remains ambiguous, retain its written description and mark it for review rather than assigning an unrelated picture.

The first version can display separate detail thumbnails. Composing those components into a single front/back preview is a later enhancement that needs explicit compatible anchor points and geometry. Showing every selected part in one assembled picture without that work could imply a design that cannot actually be stitched as drawn.

The launch inventory is also a maintenance tool. Track each entry through planned, drafted, reviewed and published states, with its view, aliases and version. The supplied JSON is intentionally marked planned. It contains no fabricated asset URLs and should not be used to make the interface promise pictures that have not been prepared.

## Implementation in the existing architecture

Introduce a feature module such as `src/features/design-library/` for library contracts, search hooks, picker components and compatibility rules. Keep authenticated routes thin, put transactions and persistence in `src/services/`, and extend Drizzle through additive migrations. The Settings and order features should consume these public contracts rather than maintaining separate image lists.

| Record | Required responsibility |
| --- | --- |
| Design asset | Stable ID, kind, family/tags, display name, aliases, view, active state, revision and built-in artwork or uploaded-media reference |
| Media object | Shop ownership, immutable storage key, dimensions, MIME type, checksum, thumbnail/preview variants and processing state |
| Garment design configuration | Which groups and choices apply to a particular shop product; optional named design presets |
| Piece design snapshot | Agreed choice IDs, labels, asset versions and reference images as they existed when that piece was saved |

Retain support for all existing `illustrationId` values and measurement snapshots. Add new asset references alongside them, with a documented resolution order and a migration that preserves existing records. The current library's legacy IDs should continue rendering their original artwork. Changing a garment name, archiving an asset or publishing a replacement must not break old orders.

Move library search to its own paginated query as the collection grows. Do not send hundreds of full images or base64 strings through the shop catalogue JSON. Return compact metadata and URLs for the current page. Keep the library's capacity separate from the current 50-product cap; importing artwork should not add products, prices or measurement templates to the shop.

Design defaults require deliberate behaviour. They can propose a look for a new order, but the saved order should record what was selected. Changing construction or garment type should request review of affected choices and measurements. Compatibility rules should be defined per garment; a global list must not offer a blouse back on a pair of trousers or a cuff on a sleeveless design.

## Custom uploads and Railway storage

The existing bucket connection can support media storage. Railway documents private buckets, temporary presigned access and backend proxy delivery. Store permanent object identities in the database and create authorized delivery links when needed; an expiring URL should not become the permanent reference on an old order.[^12]

For an initial implementation, accept JPEG, PNG and WebP images; use a proposed 8 MB upload limit and a separate decoded-pixel limit. Validate the actual file, apply orientation, remove unnecessary metadata and generate a thumbnail plus an enlarged preview. Treat SVG supplied by a user as a separate import feature; the trusted built-in SVG assets can continue shipping with the application. Authorization, type checks, application-generated filenames and bounded uploads follow OWASP's guidance.[^13]

A practical starting delivery design is an authenticated media endpoint that resolves a media ID and redirects to a short-lived signed thumbnail or preview URL. Produce the display variants during processing. Next.js documents that its default image optimizer does not forward authentication headers to the source; use preprocessed images through an appropriate unoptimized/authenticated delivery path, or design and test a suitable loader.[^15]

File storage and a database transaction have separate failure modes. Track pending and ready uploads; only attach ready, shop-owned media to a garment or order. Make retries reuse the same upload identity where possible. Clean up abandoned files after a grace period, and protect any version referenced by an existing piece. Archiving should remove a choice from future selection without deleting historical references.

Use immutable filenames for replacements. Record that a picture is a front, back or detail view, and preserve that designation in the order. Reusing a shop design can share a media identity; replacing it should produce a new version. Account for media objects in backup and restore procedures as well as database rows.

## Delivery sequence and completion criteria

| Stage | Deliverable | Acceptance condition |
| --- | --- | --- |
| Library foundation | Categorized searchable asset records, legacy-ID compatibility and custom uploads | The owner can add a new usable picture without a code deployment; old pictures still render |
| Broad artwork set | The 70 proposed garment models, retaining existing matching drawings | Every enabled entry has reviewed artwork and a readable label at phone size |
| Design choices | The 80 proposed details and per-garment applicability | Only relevant choices appear; measurements remain independent; custom details can be added |
| Order agreement | Saved versioned design summaries, references and print output | Later catalogue edits cannot change an existing piece's agreed design |

The final verification should cover adding a garment beyond the original 12 pictures; selecting regional aliases; a custom front/back upload; changing and archiving that image after an order is saved; and restoring data with the historical pictures intact. It should also cover failed uploads, expired delivery links, keyboard selection, 320/390-pixel layouts, labels with long names, and library pagination with hundreds of entries.

Representative real shop jobs should be used to measure whether a person can find the right garment and design without assistance. Unknown-style searches should be recorded as catalogue gaps. The expansion is successful when those gaps can be resolved through the library and uploads, while familiar orders remain quick to create.

The research and inventory are complete. Artwork production, upload endpoints, the larger library and design-selection persistence described here remain proposed implementation work; the live application still has the previously deployed 12 garment illustrations.

## Sources

Web sources were accessed on 13 September 2026. Undated product pages are current published descriptions at access time, not independently verified feature or availability guarantees. Source code observations refer to release `574745bede21cac820f8154a17633936dc3dc2e3` and documentation commit `c612e2f` in the local Swapna Garments repository.

[^1]: Fashion Dot. [Plan Features — Blouse, Neck & Churidar](https://www.fashiondot.in/plan-features). Undated. Garment-model and design-option structure and published counts.
[^2]: Fashion Dot. [Tailoring CAD Max](https://www.fashiondot.in/tailoring-cad-max). Undated. Published custom-design and reusable-pattern workflow.
[^3]: Tailornova. [Design your own clothes in seconds](https://tailornova.com/explore). Undated. Intermixable templates, variable lengths, vector flat sketches and availability caveats.
[^4]: eShakti. [Balloon sleeve cotton knit top](https://www.eshakti.com/shop/Tops/Balloon-sleeve-cotton-knit-top-CL0054725). Undated. Product-level design options and the notice suspending orders.
[^5]: SVG Repo. [Licensing](https://www.svgrepo.com/page/licensing). Licence overview with changelog through 3 January 2023. Individual assets may have different terms.
[^6]: Flaticon. [Terms of use](https://www.flaticon.com/legal). Undated. In particular the content-use restrictions concerning image services, databases and redistribution.
[^7]: Freepik / Flaticon. [Saree icon](https://www.flaticon.com/free-icon/saree_15371661). Undated. An example of garment artwork availability and asset-specific attribution information.
[^8]: Noun Project. [Icons API](https://thenounproject.com/api/). Undated. Formats, metadata, search/style matching and a separately managed API offering.
[^9]: Noun Project. [Terms of Use](https://thenounproject.com/legal/). Effective 2 September 2026. Per-content licences and incorporation of additional API terms.
[^10]: FashionDesign411. [Fashion Flat Sketches Downloads](https://www.fashiondesign411.com/collecton/fashion-sketches-templates-downloads/apparel-fashion-flat-sketches/). Undated. Apparel-category organization and downloadable drawing resources; the earlier Designers Nexus collection redirects here.
[^11]: Designers Nexus Inc. [Terms of Service](https://www.designersnexus.com/terms-of-service/), linked from [FashionDesign411 Terms of Use](https://www.fashiondesign411.com/terms-of-use/). Undated. Download ownership and redistribution restrictions.
[^12]: Railway. [Uploading & Serving Files](https://docs.railway.com/storage-buckets/uploading-serving). Undated living documentation. Private storage, presigned delivery, proxying and upload patterns.
[^13]: OWASP Foundation. [File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html). Undated living guidance. Authorized uploads, validation, filename and size controls.
[^14]: W3C Web Accessibility Initiative, Education and Outreach Working Group; editors Eric Eggert and Shadi Abou-Zahra. [Functional Images](https://www.w3.org/WAI/tutorials/images/functional/). Updated 12 April 2017. Accessible action labels and images accompanying equivalent link text.
[^15]: Next.js. [Image Component](https://nextjs.org/docs/app/api-reference/components/image). Living documentation. Authentication-header behaviour of the default optimizer and SVG handling. Implementation should also follow the documentation bundled with this repository's installed Next.js version.
