import type { Garment } from "../contracts/catalogue";
import type { GarmentIllustrationId } from "../contracts/garment-illustration";

export const garmentIllustrationLabels: Record<GarmentIllustrationId, string> =
  {
    blouse: "Blouse",
    churidar: "Churidar / salwar set",
    gown: "Gown / dress",
    skirt: "Skirt / petticoat",
    pavada: "Pavada & davani",
    saree: "Saree",
    kurta: "Kurta / kurti",
    shirt: "Shirt",
    trousers: "Trousers / pants",
    lehenga: "Lehenga",
    alteration: "Alteration",
    other: "Other / service",
  };

const aliases: Record<string, GarmentIllustrationId> = {
  blouse: "blouse",
  churidar: "churidar",
  chudidar: "churidar",
  "salwar suit": "churidar",
  "salwar set": "churidar",
  "salwar kameez": "churidar",
  gown: "gown",
  dress: "gown",
  skirt: "skirt",
  petticoat: "skirt",
  pavada: "pavada",
  "pavada and davani": "pavada",
  "pavada davani": "pavada",
  "half saree": "pavada",
  saree: "saree",
  sari: "saree",
  kurta: "kurta",
  kurti: "kurta",
  shirt: "shirt",
  trousers: "trousers",
  pants: "trousers",
  pant: "trousers",
  lehenga: "lehenga",
  alteration: "alteration",
  alterations: "alteration",
};

/** Existing catalogue rows need no backfill. Custom names can select an explicit picture. */
export function resolveGarmentIllustration(
  garment: Pick<Garment, "name" | "illustrationId">,
): GarmentIllustrationId {
  if (garment.illustrationId) return garment.illustrationId;
  const name = garment.name
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  return Object.hasOwn(aliases, name) ? aliases[name] : "other";
}
