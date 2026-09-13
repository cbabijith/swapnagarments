import { readFile, writeFile } from "node:fs/promises";

// Only repository-owned SVGs are bundled. Uploaded files never enter this module.
const definitions = JSON.parse(
  await readFile(
    new URL(
      "../src/features/design-library/domain/builtins.json",
      import.meta.url,
    ),
    "utf8",
  ),
);
const artwork = {};
for (const asset of definitions) {
  const svg = (
    await readFile(
      new URL(`../public/design-library/v1/${asset.id}.svg`, import.meta.url),
      "utf8",
    )
  ).trim();
  if (/<script|<foreignObject|\bon\w+\s*=|(?:href|url\()/i.test(svg))
    throw new Error(`Unsafe built-in SVG: ${asset.id}`);
  artwork[asset.id] = `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
await writeFile(
  new URL(
    "../src/features/design-library/domain/builtin-artwork.json",
    import.meta.url,
  ),
  JSON.stringify(artwork, null, 2) + "\n",
);
console.log(`Bundled ${definitions.length} illustrations.`);
