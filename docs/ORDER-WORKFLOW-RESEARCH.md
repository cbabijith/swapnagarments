# Making Swapna Garments Easier to Use

## 1. Recommended direction

**Make New Order the main working screen.** Staff should find or add a customer, choose garments, confirm or enter measurements, set delivery and advance, and save the complete order without leaving that screen. Settings should supply the garment names, measurement fields and normal charges used by this flow.

The central recommendation is to connect three distinct records: a garment template defines what to ask, a customer measurement profile stores reusable answers, and an order piece preserves the answers agreed for that particular job. This allows fast repeat orders while keeping old work understandable after a customer's measurements change.

The active application already provides useful foundations: customer creation inside the order form, multiple pieces, delivery dates, advances, customer measurement history, production progress, and QR labels. Its main intake limitations are fixed garment names, a six-field blouse editor, and no measurements attached to the order itself. Settings currently presents connection, account and closing-report information, with no garment or measurement configuration.[^10][^11][^12][^13]

### The proposed daily experience

1. **Find the customer:** type a name or phone number; select a matching person or add one inline.
2. **Choose the garment:** select a favourite or search the shop's catalogue. Load its normal price and measurement template.
3. **Confirm the fit:** reuse that person's matching saved profile, take new measurements, or explicitly select a shop size preset.
4. **Finish the order:** enter delivery date and advance; review the total; save once.
5. **Continue working:** print the customer receipt and piece labels; open the work card when the tailor scans a piece.

### Decisions that make the flow reliable

| Decision | Recommended behavior |
| --- | --- |
| Adding a customer | New customer details are saved with the order; no separate registration task is necessary. |
| Default measurements | Default the field names and unit. Do not invent a new customer's body sizes. |
| Repeat customer | Suggest the last confirmed profile for the selected garment and wearer. Show its date. |
| New measurement | Allow both entering a new value and adding a new field, with clearly different actions. |
| Settings | Saved configuration changes must reach order entry, customer profiles, work cards and relevant printouts. |
| Historical work | Keep the garment name, price and measurement snapshot that applied when the order was accepted. |

### Scope and strength of evidence

The scope is a small custom stitching and alteration shop, particularly ladies' garments. Evidence combines Next.js source at commit `01d9d0f` with public documentation accessed on 12-13 September 2026. This code and workflow review does not establish live production behavior or measured staff usability. Recommendations describe proposed features, not completed implementation.

<!-- pagebreak -->

## 2. What comparable software demonstrates

The most relevant systems connect intake, fitting information, garment tracking and money. Their interfaces differ, but their documented features show that configurable garments and reusable measurements are established approaches in this category. No vendor has been ranked for reliability or purchasing suitability.

| Reference | Documented behavior | Application to Swapna |
| --- | --- | --- |
| DD Tailors | Its order guide describes both a three-stage form and a single-page form with inline customers and items. Garment configuration supports assigned fields, field order, types and prices.[^1][^2] | Keep customer, item and payment work together; drive the fields from the chosen garment. |
| MJ Tailor | Advertises garment-specific dynamic fields, revision history, style choices, and separate bill and workshop printing.[^4] | Make fitting changes traceable and give customer and tailor different views of the same order. |
| SmartCouture | Documents custom measuring points, measurement sheets, garment types, size templates and progress down to individual pieces.[^5] | Separate the reusable catalogue from customer sizes and preserve the existing piece-level workflow. |
| Geelus | Describes touch-oriented operation, saved/printed client measurements, barcode workflows and multiple payment types.[^6] | Make daily intake usable at the counter and ensure saved information follows the garment. |

### Three additional perspectives

DD Tailors places measurements on a family member under a customer account. This is a useful example of separating the person who pays or supplies a phone number from the person wearing the garment.[^3] For Swapna, the ordinary path should assume the customer is the wearer; an optional family-member control can appear when needed.

Seamly's measurement-editor documentation distinguishes an individual's measurements from multisize tables and describes known and custom measurements.[^8] This supports treating a standard size preset as a separate input source. It does not establish a universal size chart for this shop.

Synoptek's Arvind case study describes order-linked fabric receiving, cutting, making, quality checks, finishing and dispatch.[^9] It is an enterprise workflow example, useful for understanding production handoffs. Its historical technology and reported business savings should not be used to predict results for a small shop.

### Simplicity is a design decision

Nielsen Norman Group describes progressive disclosure: show common choices first and reveal specialized controls when needed.[^7] Applied here, customer, garment, fit, due date and payment stay visible. Less frequent controls such as family members, trial dates, special pricing and extra fields expand in context.

The available material establishes feature patterns, not that any particular interface is fastest. Product feature pages are first-party claims and often lack a dependable publication date. The recommended single-screen flow therefore needs a short task-based trial with actual counter staff before its layout is finalized.

<!-- pagebreak -->

## 3. Current application: the specific gaps

The active product is the Next.js website in `web/`. The root README contains older backend-era descriptions, so the audit prioritizes current feature code, contracts and database schemas. The table distinguishes directly observed behavior from its likely effect on staff.

| Area | Observed in the current code | Practical implication |
| --- | --- | --- |
| Customer lookup | The audited commit uses search plus a separate select. A newer local UI introduces a searchable customer picker.[^10] | Reuse and verify the new picker before building another chooser. |
| New customer | Inline name/phone creation exists, but customer and order are saved in separate commands. New customers start with empty measurements.[^10] | A customer may remain saved if order creation subsequently fails. The complete intake is not one transaction. |
| Measurements during intake | The audited form links to the customer profile. The newer picker version still lacks an inline measurement editor.[^10] | Completing fitting information requires leaving the order flow. |
| Measurement editor | The customer editor renders six fixed blouse fields, in inches, with quarter-inch steps.[^11] | Gowns, skirts and other work cannot have appropriate configurable editors. |
| Garment catalogue | Six names are defined in a constant; the order API validates against that same list.[^12] | Adding a custom product requires more than changing the dropdown. |
| Price and quantity | Every piece starts with an empty price. Staff add pieces individually.[^10] | Repeated garments need repeated entry; no catalogue price is supplied. |
| Settings | Connection details, access information and closing reports; no catalogue or template editing.[^13] | There is currently no working shop-configuration path. |
| Order measurements | Order-item types and relational columns have no measurement profile reference or snapshot.[^14] | The app cannot establish the exact measurements accepted for a historical piece. |

### Two less visible problems

**Custom fields could disappear from the current profile.** The measurement API accepts arbitrary numeric field names, but the editor submits a replacement object containing only its six rendered fields. A custom value previously supplied through an API could be absent after a normal edit. Existing history may retain earlier values, but the current profile is still replaced.[^11][^15]

**Phone cleanup is not full phone normalization.** Duplicate detection and the database key remove non-digits. A local ten-digit Indian number and the same number with `+91` produce different keys. A future customer chooser should normalize supported country formats consistently and show potential matches before a duplicate is created.[^15][^16]

These findings come from source inspection. No real customer records were inspected or modified. The existing transaction and retry protection is useful and should be extended to complete intake rather than discarded.[^17]

<!-- pagebreak -->

## 4. The proposed New Order screen

Use one responsive form with three clear sections: **Customer**, **Garments and measurements**, and **Delivery and payment**. On desktop, keep a compact order summary beside the form. On a phone, stack the sections and keep the final amount and Save Order action within easy reach without covering fields.

### Customer

Replace search plus separate selection with a searchable chooser showing name and phone together. Search on the server and retain bounded results. When there is no matching customer, offer Add customer with the typed name or phone carried into the small inline form. Require only the essential contact details; keep email and notes optional.

Selecting a result loads a compact customer summary. If a contact is used for another person, reveal Add family member or Choose wearer. Do not silently choose measurements on a phone-number match alone: the name and wearer still need to be clear.

### Garments and measurements

Show favourite garments first, followed by catalogue search. Selecting a garment brings in its normal charge, its template, and any matching saved customer profile. The piece then displays a short fit summary and an obvious Edit measurements action. For a first visit or incomplete profile, expand the measurement fields immediately.

Support quantity for identical pieces, with a Duplicate piece action for similar work. A line with quantity three still produces three tracked pieces and three labels. Any piece can be separated when fabric, price, design or measurements differ. Do not change an existing piece's garment without clearing or remapping incompatible measurement values.

### Delivery and payment

Keep delivery date visible and required for a confirmed order. An owner-configured lead time can suggest a date, but workload and the promised date remain staff decisions. Normal priority can be the default. Show trial date only when the shop uses fittings or staff expands the option.

Calculate price, additional charges, advance and balance immediately. An advance field records money actually received; it must never imply a payment was received just because the shop prefers a deposit. Provide Save Draft when required information is missing and Save Order when the job can be accepted.

### Example: a returning customer

The customer requests two blouses. Staff searches the phone number, selects the customer, chooses Blouse and sets quantity two. A dated blouse profile appears. Staff changes the second piece's sleeve length, sets the agreed date, records the advance and saves. The changed sleeve can apply only to that piece, while both pieces retain separate work cards.

### Example: a new customer

Staff enters a new phone number and name inside the same form. Choosing Gown opens the gown template with empty body values. Staff takes measurements, enters the agreed price/date and saves. The system creates the customer, the confirmed profile, the order, its pieces and the payment record together, then returns a receipt and labels.

<!-- pagebreak -->

## 5. Defaults and measurement reuse

The word default needs three separate meanings in the interface. Keeping them separate avoids both repeated typing and accidental assumptions about a person's size.

| Concept | What it stores | How it is used |
| --- | --- | --- |
| Garment template | Fields, labels, display order, unit, required rules and measurement method. | Automatically shown when that garment is selected. Body values start empty. |
| Customer profile | A named, dated measurement set for one wearer and garment/template. | Suggested for the next compatible order, with a review action. |
| Shop size preset | An explicitly named size such as the shop's Blouse 36 chart. | Loaded only when staff chooses that preset; reviewed before cutting. |

### Which values should win?

For a new order, load the default profile explicitly chosen for that wearer and garment. If no default exists, suggest the latest confirmed compatible profile. If there is no compatible profile, open blank fields; allow an explicit size preset as an alternative. A garment name match by itself is insufficient if the measurement method changed.

Once staff edits a value, it belongs to the draft and must not be overwritten by a background refresh. Choosing a different profile or preset should preview the replacement, especially when staff has already typed values. Repeating an old order should offer its actual historical snapshot and show whether a newer profile exists.

### Where should a changed value be saved?

Show a small choice beside changed measurements: **This order only** or **Also update saved profile**. For a newly measured customer, saving the initial profile with the order is the normal path. For an existing customer, an order-specific change should not silently replace the reusable profile. Body values and garment design choices may change for different reasons.

When one order contains different fits for the same person and garment, the system cannot automatically decide which should become the new default. Let staff select the intended set or create a named alternative. Record when and by whom each profile was confirmed; show the last recorded date on subsequent intake.

### Measurement meaning and units

Each numeric field needs a definition. Body bust circumference, finished garment bust and a flat half-width are different measurements even when their labels look similar. Record the measurement basis and do not apply ease or multiply values silently. Short help text and a measurement-point sketch can prevent ambiguity.

Preserve inches as the initial shop default because the current data is labelled that way. Store a unit explicitly with every saved set. If centimetres are introduced, convert values deliberately and show the resulting unit; never just relabel the numbers. Allow configurable precision because quarter-inch steps are a current interface choice, not a rule that every garment must follow.

### Missing measurements

Allow intake to be saved as a draft or as an accepted order marked Measurements pending, according to shop policy. In either case, block cutting until the garment's required fields or an approved reference-garment method are confirmed. Missing information should remain visible in the daily queue and must not be replaced with guessed values.

<!-- pagebreak -->

## 6. Garments, fields and custom additions

Start with a small editable library that reflects the actual shop's work. Preserve existing garment names as catalogue entries so old records remain recognizable. Seed field definitions, not fabricated body-size values. The examples below are proposed starting points; the cutting master should confirm names, required fields and methods.

| Garment | Candidate measurement fields | Separate design or service options |
| --- | --- | --- |
| Blouse | Bust, waist, shoulder, armhole, sleeve length, sleeve opening, blouse length, front neck depth, back neck depth. | Neck shape, sleeve style, lining, padding, opening, embroidery. |
| Churidar / kurta set | Separate top and bottom sections: bust, waist, hip, shoulder, sleeve, top length; bottom waist, hip, thigh, rise, ankle, bottom length. | Top style, lining, bottom style and closure. |
| Gown | Bust, waist, hip, shoulder, armhole, sleeve, waist length and total length. | Silhouette, lining, fastening, flare and occasion notes. |
| Skirt / pavada | Waist, hip, length and any design-specific hem measurement. | Waistband, elastic, lining and flare. |
| Alteration | Only measurements relevant to the work: target hem length, waist change or sleeve adjustment. | Operation, pinned/reference garment received and instructions. |

### Product names and services

Use Garments & services as the settings name. A catalogue entry needs an ID, displayed name, active state, default charge, linked template and display order. An optional category helps organize a larger list. Favourite entries should be the ones staff can reach first at the counter.

Decide whether Designer blouse is a separately priced product or Blouse with design extras based on the shop's actual quoting practice. Avoid creating a new garment for every fabric colour. Fabrics, garment types, add-on services and measurement templates have different purposes even when all appear in the order form.

### Add measurement value versus add measurement field

**Enter or update measurements** changes a customer's values, such as sleeve length. **Add field** introduces a new question, such as back neck depth. Name both actions explicitly so staff does not have to understand database terminology.

An extra field needs a label, type, unit where applicable, optional help, and scope. Offer **This piece only** for a special request. Owners can choose **Add to this garment template** for a recurring requirement. Keep one-off requests out of every future order unless someone intentionally promotes them.

Use numeric fields for dimensions, choices for styles, yes/no fields for options, and short text for instructions. An option that changes price should have an explicit charge rule; merely adding a measurement field must not change the bill. Stable internal IDs should remain unchanged when labels are renamed or translated.

### Template evolution

Publishing a new template version affects newly created work. Existing pieces keep their original field definitions and values. A newly required field should appear as missing when an old profile is reused, rather than being assigned a made-up answer. Changed measurement methods need a new definition or an explicit mapping, not automatic reuse under a familiar label.

<!-- pagebreak -->

## 7. Settings that work throughout the app

Settings should answer ordinary shop questions: What do we stitch? What do we measure? What do we charge? Which options do we normally use? Keep infrastructure details in a secondary System information area so business setup is easy to find.

| Settings area | Essential controls | Where the change must appear |
| --- | --- | --- |
| Garments & services | Add, rename, duplicate, archive, reorder, favourites, default charge and template. | Order chooser, price suggestion, customer garment profiles and catalogue-based reports. |
| Measurement templates | Add/reorder fields, label, type, method, unit, required rule and preview. | New Order editor, customer editor and piece work card. |
| Size presets | Named value sets belonging to a particular template version and unit. | Explicit preset chooser during measurement entry. |
| Design options & extras | Allowed options, optional charge, availability by garment and print visibility. | Piece editor, quote breakdown and appropriate printout. |
| Order defaults | Normal priority, suggested lead time, default garment and trial-date preference. | New drafts and fresh order forms. |
| Shop & printing | Shop details, receipt information and label preferences supported by the implementation. | Customer receipt and workshop documents. |

### A concrete end-to-end example

The owner adds A-line kurti, links a copied and adjusted kurta template, sets a normal charge, and saves. A counter device refreshes its catalogue and can select A-line kurti. Selecting it opens the configured fields and price. An order saves successfully, then reopens with the same garment name, values and price on its work card and printout.

The owner later renames the catalogue item or increases the normal charge. Newly added order items use the new information. Existing orders retain their accepted name and price. Staff editing an already open draft sees that catalogue information changed and can choose to refresh suggestions without losing typed values.

### What successful Save means

The server validates and persists the configuration, returns the saved version, and the interface displays success only after that response. Refreshing the page and opening another device must reproduce the settings. A failed save keeps the form's edits visible with a useful error; it must not report success based only on browser state.

Template preview must use the same renderer as order entry. Otherwise the owner can configure something that looks correct in Settings but behaves differently at the counter. Printing, reads, writes, validation and historical rendering must also consume the saved definitions rather than independent hard-coded lists.

### Change controls

Archive products and fields that have already been used; keep historical references accessible. Let owners edit global templates and prices, with staff permissions added through the existing authentication model as supported. The server must enforce these permissions. When two owners edit the same template, detect the version conflict and preserve the unsaved work instead of silently taking the last write.

An empty catalogue needs a clear Add your first garment path. A product with no price can prompt for an agreed charge. A service that needs no dimensions can explicitly select No measurements required. These are valid configurations and should not need dummy data.

<!-- pagebreak -->

## 8. The data and save behavior needed

The recommended interaction depends on server-side changes. A new dropdown or a locally stored settings form cannot provide reliable custom garments, versioned profiles and order snapshots by itself. Continue the existing feature UI, thin API, service and Drizzle architecture.[^18]

| Record | Purpose and minimum contents |
| --- | --- |
| Garment / service | Stable ID, name, active flag, default price, sort order and template reference. |
| Template version | Immutable version identity, field definitions, labels, data types, methods and units. |
| Measurement profile | Customer or wearer, template identity, name, preferred/default flag and current confirmed version. |
| Profile version | Typed values, unit, recorded/confirmed date, author and source. |
| Order piece | Product reference plus accepted name, price, options and measurement snapshot; existing piece ID and workflow state. |
| Draft intake | Recoverable customer/item edits, configuration versions and incomplete fields; not a confirmed payment or production job. |
| Shop configuration | Defaults and supported preferences, with version/conflict information. |

The order snapshot should contain enough field metadata to render the work card even after the source field is archived. It should distinguish a profile reference from a copy of the actual values. Keeping only a profile ID would make historical work change whenever that profile is updated.

### One command for complete intake

Use an intake service behind an authenticated order API. Validate the customer choice or new-customer details, product availability, template versions, values, prices, date and payment together. Resolve the customer, save the permitted profile changes, create the order and its individual pieces, and record the advance in one database transaction.

Keep one retry identity for the whole submission. A timeout followed by Retry must return the original order, not create another customer, order or advance. Reuse the current fingerprint and transaction protections; extend them to the larger intake command. Do not assume that two separately successful API calls are equivalent to one atomic save.[^17]

### Failure and concurrency cases

If the customer is added by another counter while the draft is open, return the matching record and let staff resolve the identity. If a product is archived or a template changes before submission, preserve the draft and explain the specific issue. Do not silently switch to a different product or template to make the request pass.

Server validation should use stored definitions and selected versions rather than trusting arbitrary field labels from the browser. Reject unknown or incompatible field IDs, enforce required fields for the relevant stage, and validate typed values. Historical items remain readable even if their former catalogue item is now archived.

### Side effects and draft recovery

Return the receipt only after the transaction commits. Printing can be retried independently. Any future automatic message should be driven by a committed, durable event and an idempotent consumer; durable events remain a documented architecture stage, not a completed messaging feature.[^18]

Preserve draft work when lookup, validation or saving fails. A persistent draft must be scoped to the authenticated shop/session and cleared or made inaccessible on sign-out. Browser persistence alone is not equivalent to a confirmed order or complete offline support. Keep saved versus unsaved status explicit.

<!-- pagebreak -->

## 9. Migration and acceptance checks

Existing customer and order data should survive the change without being reinterpreted as more precise than it is. The current customer object has one untyped garment-level set and the order schema lacks historical measurement snapshots.[^14][^15] Migration must acknowledge those limits.

### Preserve the current records

Create catalogue entries matching the six existing garment names and retain a legacy display name on old pieces. Preserve IDs, piece workflow state, amounts, payments and dates. Map the six known measurement labels to stable fields, retaining unknown keys and their values rather than dropping them.

The current interface calls the profile Blouse measurements, which is a reasonable migration hint. However, store migrated sets with a legacy/unverified marker until their garment and method are confirmed. Keep the original measurement history and its timestamps. Do not claim those timestamps identify when a measurement was originally taken: the current domain stores a prior value set when it is replaced.[^15]

Old orders cannot be given verified original measurements from today's customer profile. Mark them Historical measurements unavailable unless reliable order-specific evidence exists. If a current profile is displayed as assistance, label it clearly as current customer data, not the accepted measurements for that old job.

### Essential acceptance scenarios

| Scenario | Pass condition |
| --- | --- |
| New customer plus new order | One customer, one profile and one order save together; injected failure leaves no partial intake. |
| Repeat customer | Correct garment/wearer profile loads with date; another customer's values never carry across. |
| Gown and blouse together | Each piece uses its own template and snapshot. |
| Different second blouse | Editing its sleeve leaves the first piece and saved profile unchanged unless explicitly selected. |
| New product in Settings | Appears on another device, survives refresh, saves via API and renders on work card and receipt. |
| New custom field | Survives save, reopen, customer edit, print and export wherever applicable. |
| Template rename/archive | New work follows active settings; old work retains its original definition. |
| Missing sizes | Intake remains visible as incomplete; cutting is blocked until the requirement is satisfied. |
| Retry after timeout | Returns the original result; no duplicate order, profile or advance. |
| Profile changed elsewhere | Conflict is visible; typed values remain available for resolution. |
| Unit or measurement-method change | Values are converted or remapped explicitly; old records keep their original meaning. |
| Legacy migration | Existing IDs, history, totals, payments and workflow positions reconcile exactly. |

### Measure whether it became easier

Observe a returning-customer order, a new-customer order, a mixed-garment order and an owner adding a garment. Record completion time, page departures, repeated typing, incorrect profile selections and failed saves. Physical measuring time should be measured separately from software entry time.

Proposed targets are zero required page departures during normal intake, zero repeat typing of unchanged saved sizes, no silent value replacement, and successful use of new settings after refresh. Compare task timings against the current interface instead of promising an unsupported percentage or a universal one-minute order.

<!-- pagebreak -->

## 10. Implementation order and boundaries

### First release: make the core path complete

Start with persisted garments and template definitions, followed by customer measurement profiles and piece snapshots. Build the Settings editor and the new intake form over that same data. Add the complete intake transaction and ensure work cards and receipts read the snapshots. These pieces form one usable release: configuration has little value if the order API or printing still rejects it.

Keep the visible scope small: active garments, basic prices, numeric measurement fields, appropriate style options, customer lookup, inline customer entry and one final save. Preserve existing piece tracking and billing rules. Validate the new path in an isolated database before rehearsal with existing records.

### Second release: reduce repeat work

Add profile selection/history, repeat previous order, quantities with individual piece overrides, draft recovery, favourite garments and owner-controlled defaults. Complete the customer chooser's duplicate and supported phone-format handling. Trial these interactions with the people who take orders daily and refine labels based on where they hesitate.

### Further releases: optional complexity

Add family-member profiles when shared contacts are needed, named size presets when the shop actually uses them, and richer design add-ons when they improve quoting. Sketch guidance, design photos, more configurable production routes, retail stock and automatic messages can follow as separately scoped features. Preserve the original request to support shop workflow; do not introduce stock-management complexity into ordinary stitching intake without a business need.

### Ready-made sales and bulk work

If ready-made products are sold, a retail item should explicitly require no tailoring measurements and manage its own size/colour variant and stock behavior. It should not be forced through a blouse form. For uniforms or family batches, wearer identity and per-person sizes become central; quantity alone cannot represent many people with different fits.

These alternative workflows affect the later model, but they do not block a custom-stitching first release. The profile and piece design should make them possible without forcing every ordinary order to include family, variant or bulk-entry controls.

### Decisions to settle during the first staff trial

Confirm the blouse field names and their exact measuring method with the cutting master. Establish whether inch fractions finer than a quarter inch are needed. Identify the garments and charges used most often, whether the shop keeps standard size charts, and whether contacts are regularly shared by multiple wearers.

Also confirm how staff accepts cloth before measurements are taken, when a profile is considered confirmed, and who may change normal prices. These are operational choices. They should become settings or explicit actions where useful, rather than hidden assumptions in code.

### Expected result

The intended improvement is an order process where entering information once carries it through the customer's history, the garment's work card and the bill. Success means the owner can add a garment or measurement in Settings and use it immediately, while the tailor can still see exactly what was agreed for an older order.

<!-- pagebreak -->

## 11. Sources

Public references were accessed on 12-13 September 2026. Retrieval dates establish the evidence window; they do not establish product release dates. Vendor pages support documented feature claims, not independent verification of performance, reliability or completeness. No prices, vendor rankings or ROI estimates are used.

[^1]: Duo Dev Technologies. [Orders Management](https://tailors.duodev.in/docs/orders), DD Tailors documentation. No independently verified publication date. Used for the documented classic and modern order-entry patterns.

[^2]: Duo Dev Technologies. [Garment & Measurement Configuration](https://tailors.duodev.in/docs/garments), DD Tailors documentation. No independently verified publication date. Used for configurable garment fields, ordering and rates; also documents preserving an existing order's measurement structure.

[^3]: Duo Dev Technologies. [Customer Management](https://tailors.duodev.in/docs/customers), DD Tailors documentation. No independently verified publication date. Used for contact details, duplicate phone checking and family-member ownership of measurements.

[^4]: MJ Tailor. [Tailor Management Software](https://mjtailor.com/), especially Custom Measurement Book, Dynamic Templates, Automatic Version History and Flexible Receipt Printing. Undated product page. Used for template/history and customer-versus-workshop document patterns.

[^5]: SmartCouture. [Features of the tailoring management software](https://www.smartcouture.app/en/features). Undated product page. Used for custom measuring points, garment sheets, size templates and piece-level production tracking.

[^6]: Geelus / Transactt. [Tailoring Shop Software](https://geelus.com/tailoring-shop-software/), especially Smart Features to Simplify Your Business. No dependable editorial publication date. Used for touch operation, measurement printing, barcode workflows and multiple payment types.

[^7]: Jakob Nielsen, Nielsen Norman Group. [Progressive Disclosure](https://www.nngroup.com/articles/progressive-disclosure/), 3 December 2006. Used as longstanding interface-design guidance; not a tailoring-specific usability experiment.

[^8]: Pneumarian, Seamly Patterns Forum, Documentation / How to. [How to make an individual measurements file](https://forum.seamly.io/t/how-to-make-an-individual-measurements-file/17616), 16 August 2026. Project-hosted community tutorial, used for individual versus multisize measurement concepts and known/custom fields. It is not a commercial tailoring POS reference or a universal measurement standard.

[^9]: Synoptek. [Tailoring Management System Helps a Textile Manufacturer Automate Manual Processes and Achieve Operational Excellence](https://synoptek.com/insights/case-studies/tailoring-management-system-helps-a-textile-manufacturer-automate-manual-processes-and-achieve-operational-excellence/), Arvind case study. Historical, undated HTML page with a related PDF under a 2019 upload path. Used only for order-linked production handoffs, not current architecture or forecast savings.

### Evidence boundaries

Public documentation was read beyond search snippets for the core comparisons. Some additional search leads, including inaccessible vendor manuals and an Odoo app page, were excluded from the factual comparison. No trial account was created and no vendor's authenticated software was tested. The recommended screen layout, data model, defaults and acceptance criteria are analytical proposals informed by these references and the code audit.

<!-- pagebreak -->

## 12. Local source references

These references identify the reviewed repository snapshot at commit `01d9d0f`. Line numbers locate the relevant implementation at that revision. The repository is the evidence for current behavior; public vendor documentation is not used to infer what Swapna already supports.

A newer uncommitted UI version includes a searchable customer picker and revised labels. Its runtime behavior is unverified. Reconcile those changes before implementation; the fixed measurement editor, catalogue contract and absent order snapshots remain in the inspected version. Source locations below primarily identify the audited commit and may move during editing.

[^10]: Swapna Garments. [NewOrderForm](C:/flutter_projects/swapnagarments/web/src/features/orders/components/orders.tsx:292). At the audited commit: selection at 395-451, sequential customer/order save at 343-376, profile link at 485-506 and manual price entry. Newer uncommitted UI uses [CustomerPicker](C:/flutter_projects/swapnagarments/web/src/features/customers/components/customer-picker.tsx:150); its functionality was not tested for this report.

[^11]: Swapna Garments. [CustomerDetail and measurement editor](C:/flutter_projects/swapnagarments/web/src/features/customers/components/customers.tsx:268). Blouse heading/unit at 268; replacement form submission at 350-357; six fixed fields and quarter-inch step at 371-390. Read from the local working tree.

[^12]: Swapna Garments. [Garment constants](C:/flutter_projects/swapnagarments/web/src/shared/workspace.ts:25) and [order request validation](C:/flutter_projects/swapnagarments/web/src/features/orders/contracts/order.ts:5). Fixed catalogue and `z.enum(GARMENTS)` constrain available products. Read from the local working tree.

[^13]: Swapna Garments. [SettingsPage](C:/flutter_projects/swapnagarments/web/src/features/settings/components/settings.tsx:19). Displays connection, access and closing reports; contains no garment, measurement or business-default editor. Read from the local working tree.

[^14]: Swapna Garments. [Order and OrderItem types](C:/flutter_projects/swapnagarments/web/src/features/orders/types/index.ts:5) and [orderItems schema](C:/flutter_projects/swapnagarments/web/src/db/schema/orders.ts:58). No per-piece measurement reference, unit, values or template snapshot. Read from the local working tree.

[^15]: Swapna Garments. [Measurement contract](C:/flutter_projects/swapnagarments/web/src/features/measurements/contracts/measurements.ts:3), [customer types](C:/flutter_projects/swapnagarments/web/src/features/customers/types/index.ts:1), and [saveCustomer rule](C:/flutter_projects/swapnagarments/web/src/features/customers/domain/saveCustomer.ts:5). Numeric record fields, one customer measurement map, previous-value history and digit-stripped duplicate detection. Read from the local working tree.

[^16]: Swapna Garments. [Customer schema](C:/flutter_projects/swapnagarments/web/src/db/schema/customers.ts:15) and [workspace persistence](C:/flutter_projects/swapnagarments/web/src/services/workspace-storage.ts:153). Unique workspace/phone key and digit-only key generation. Read from the local working tree.

[^17]: Swapna Garments. [executeWorkspaceCommand](C:/flutter_projects/swapnagarments/web/src/services/workspace-service.ts:54). Transaction locking, canonical payload fingerprint and mutation identity. Supports existing commands, not an atomic combined new-customer/measurement/order intake. Read from the local working tree.

[^18]: Swapna Garments. [Architecture alignment](C:/flutter_projects/swapnagarments/docs/ARCHITECTURE-ALIGNMENT.md:1) and [web application guidance](C:/flutter_projects/swapnagarments/web/AGENTS.md:11). Active Next.js/service/Drizzle architecture and pending durable-event stage. The architecture file reports deployed migration and paginated reads; deployment status was not independently retested for this report.
