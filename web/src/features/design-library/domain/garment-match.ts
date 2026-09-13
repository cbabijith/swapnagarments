import { builtinAssets } from "./registry";

const extraAliases: Record<string, string[]> = {
  "basic-saree-blouse": ["blouses", "ബ്ലൗസ്"],
  "princess-seam-blouse": ["princess blouse", "princess cut blouse"],
  "darted-blouse": ["dart blouse"],
  "pavada-and-davani": ["pavada", "davani", "dhavani", "half sari", "പാവാട"],
  "pattu-pavadai": ["pattu pavadai", "silk pavada"],
  saree: ["sarees", "സാരി"],
  "straight-kurta": ["kurtas", "കുർത്ത"],
  "short-kurti": ["kurtis"],
  "churidar-set": [
    "churidhar",
    "chudithar",
    "churithar",
    "salwar set",
    "ചുരിദാർ",
  ],
  "salwar-suit": ["salwar", "shalwar suit"],
  "straight-trousers": ["trouser", "പാന്റ്"],
  "saree-petticoat": ["petticoat", "pavadai", "in skirt"],
  "a-line-skirt": ["skirt", "skirts"],
  "a-line-dress": ["dress", "dresses"],
  "evening-gown": ["gowns", "ഗൗൺ"],
  shirt: ["shirts", "ഷർട്ട്"],
  "t-shirt": ["tshirt", "tee shirt"],
  "kurta-pyjama-set": ["kurta pajama", "kurta pyjama"],
  "pyjama-set": ["pajama set", "pyjama", "pajama", "pyjamas", "pajamas"],
  nightdress: ["nighty", "nightie", "night gown", "night dress"],
  frock: ["frocks", "girls dress", "girl dress", "children dress"],
  "kids-kurta-set": ["kids kurta", "boys kurta", "boy kurta"],
  "kids-lehenga-set": ["kids lehenga", "girls lehenga", "girl lehenga"],
  "uniform-trousers": ["uniform pants", "uniform pant"],
  alteration: ["alterations", "alter", "repair", "repairs"],
};

export function normalizeGarmentName(name: string) {
  return name
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/&/g, " and ")
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, " ")
    .trim();
}

const candidates = builtinAssets
  .filter((asset) => asset.kind === "garment")
  .flatMap((asset) =>
    [
      asset.label,
      ...asset.aliases,
      ...(extraAliases[asset.id.slice(8)] ?? []),
    ].map((name) => ({ asset, name: normalizeGarmentName(name) })),
  );

/** Whole words allow custom descriptions without matching unrelated substrings. */
export function matchGarmentAsset(name: string) {
  const normalized = normalizeGarmentName(name);
  if (!normalized) return undefined;
  const exact = candidates.find((candidate) => candidate.name === normalized);
  if (exact) return exact.asset;
  const words = new Set(normalized.split(" "));
  const matches = candidates.filter((candidate) =>
    candidate.name.split(" ").every((word) => words.has(word)),
  );
  // A specific model (e.g. princess blouse or kids kurta) beats its generic type.
  matches.sort(
    (a, b) =>
      b.name.split(" ").length - a.name.split(" ").length ||
      b.name.length - a.name.length,
  );
  return matches[0]?.asset;
}
