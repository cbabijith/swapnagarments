# Garment image matching and loading

Garment images update as the name changes. Matching normalizes punctuation,
spacing and case, accepts common tailoring aliases, and recognizes garment names
inside descriptions such as “Designer blouse” or “School uniform shirt”. A more
specific model such as “Princess blouse” wins over a generic blouse. Matches use
whole words; unknown names display a clear prompt to choose an image. Explicit
image choices keep precedence, and saved order snapshots remain unchanged.

All 150 repository-owned illustrations are embedded in a generated data-URL
module. The complete module is approximately 12 KB gzip. They render without
separate image requests, including catalogue rows, the garment editor, library
pages and enlarged previews. To regenerate after changing SVG artwork, run:

```sh
node web/scripts/generate-design-artwork.mjs
```

The regression test checks every embedded image against its original SVG,
rejects executable or external SVG content, and bounds the compressed size.
Uploaded photographs remain behind the authenticated image endpoint.

Library metadata is cached in memory for the current login session, bounded to
32 pages and 60 seconds. A paginated library response also supplies saved
built-in preferences and the total number of uploads. The client can filter and
page the fixed built-in catalogue immediately when uploads cannot affect those
results. Queries that could include uploads remain paginated server reads; the
next page is prepared in the background and remote text searches are debounced.
Writes invalidate metadata. Returning focus and the visible refresh interval
refresh preferences. Session changes get a separate cache; private metadata is
never stored in localStorage or a shared HTTP cache.

Validation covers name matching, explicit choices, immutable snapshots, all 150
artwork files, cache expiry, favourites, archives and mixed upload queries. The
browser check exercises add/save/reopen, manual override/reset and library
pagination at 1440 px and 390 px, with standalone SVG requests blocked. Its API
fixtures are isolated; no production shop records are created.
