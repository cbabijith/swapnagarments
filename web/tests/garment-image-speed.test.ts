import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import {
  garmentImage,
  snapshotDesign,
} from "../src/features/design-library/domain/designs";
import {
  builtinAssets,
  builtinById,
} from "../src/features/design-library/domain/registry";
import { LibraryCache } from "../src/features/design-library/domain/library-cache";
import {
  libraryQuerySchema,
  toAssetRef,
} from "../src/features/design-library/contracts";
import { defaultCatalogue } from "../src/features/settings/domain/catalogue";
import artwork from "../src/features/design-library/domain/builtin-artwork.json";

test("garment descriptions match specific models, aliases and whole words while explicit choices win", () => {
  const examples: Record<string, string> = {
    "Designer blouse": "basic-saree-blouse",
    "Bridal princess blouse": "princess-seam-blouse",
    "Princess seam blouse with lining": "princess-seam-blouse",
    "Cotton A–line kurta": "a-line-kurta",
    "School uniform shirt": "uniform-shirt",
    "Kids party frock": "frock",
    "Boys kurta": "kids-kurta-set",
    "Silk saree petticoat": "saree-petticoat",
    "Designer salwar suit": "salwar-suit",
    "Cotton chudithar": "churidar-set",
    "Ladies nighty": "nightdress",
    "Cotton T shirt": "t-shirt",
    "Pavada & davani": "pavada-and-davani",
    ബ്ലൗസ്: "basic-saree-blouse",
    "  PRINCESS   BLOUSE  ": "princess-seam-blouse",
    "Shirting fabric": "other-or-service",
    "Unknown custom service": "other-or-service",
    "": "other-or-service",
  };
  for (const [name, id] of Object.entries(examples))
    assert.equal(garmentImage({ name }).id, `garment-${id}`, name);
  for (const asset of builtinAssets.filter((a) => a.kind === "garment")) {
    for (const name of [asset.label, ...asset.aliases])
      assert.equal(garmentImage({ name }).id, asset.id, name);
  }
  const selected = toAssetRef(builtinById["garment-shirt"]);
  assert.deepEqual(
    garmentImage({ name: "Designer blouse", image: selected }),
    selected,
  );
  assert.equal(
    garmentImage({ name: "Designer blouse", illustrationId: "shirt" }).id,
    selected.id,
  );
  const garment = {
    ...defaultCatalogue().garments[0],
    name: "Designer blouse",
    image: undefined,
    illustrationId: undefined,
  };
  const snapshot = snapshotDesign(garment, undefined);
  garment.name = "School uniform shirt";
  assert.equal(snapshot.garmentImage?.id, "garment-basic-saree-blouse");
  assert.equal(garmentImage(garment).id, "garment-uniform-shirt");
});

test("all built-in image data is bundled, safe and identical to the original drawings", () => {
  assert.equal(Object.keys(artwork).length, 150);
  for (const asset of builtinAssets) {
    const url = (artwork as Record<string, string>)[asset.id];
    assert.ok(url.startsWith("data:image/svg+xml,"));
    const svg = decodeURIComponent(url.slice("data:image/svg+xml,".length));
    assert.equal(
      svg,
      readFileSync(`public/design-library/v1/${asset.id}.svg`, "utf8").trim(),
    );
    assert.ok(!/<script|<foreignObject|\bon\w+\s*=|(?:href|url\()/i.test(svg));
  }
  assert.ok(
    gzipSync(JSON.stringify(artwork)).length < 20_000,
    "The whole illustration bundle should stay below 20 KB compressed",
  );
});

test("cached built-in filters preserve favourites and archives, expire, and never omit matching uploads", () => {
  const query = libraryQuerySchema.parse({});
  const cache = new LibraryCache(1);
  const favourite = { ...builtinAssets[1], favourite: true };
  const archived = { ...builtinAssets[2], active: false };
  const initial = {
    items: [],
    total: 149,
    page: 1,
    pageCount: 13,
    builtinOverrides: [favourite, archived],
    uploadTotal: 0,
  };
  cache.put(query, initial, 1000);
  assert.equal(
    cache.get({ ...query, source: "favourite" }, 1001)?.items[0].id,
    favourite.id,
  );
  assert.deepEqual(
    cache.get({ ...query, source: "archived" }, 1001)?.items.map((a) => a.id),
    [archived.id],
  );
  assert.equal(cache.get({ ...query, source: "upload" }, 1001)?.total, 0);
  const blouse = cache.get({ ...query, q: "blouse" }, 1001)!;
  assert.ok(
    blouse.total > 0 && !blouse.items.some((a) => a.id === archived.id),
  );
  assert.equal(cache.get({ ...query, q: "blouse" }, 61_001), undefined);
  assert.equal(new LibraryCache(2).get(query, 1001), undefined);
  cache.put(query, { ...initial, uploadTotal: 1 }, 2000);
  assert.equal(
    cache.get({ ...query, q: "blouse" }, 2001),
    undefined,
    "A server query must include matching custom images",
  );
  assert.ok(cache.get({ ...query, family: "blouse-and-traditional" }, 2001));
  assert.ok(cache.get({ ...query, ids: favourite.id }, 2001));
  assert.equal(cache.get({ ...query, ids: "upload-example" }, 2001), undefined);
});
