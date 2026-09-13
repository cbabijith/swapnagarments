export const garmentIllustrationIds = [
  "blouse",
  "churidar",
  "gown",
  "skirt",
  "pavada",
  "saree",
  "kurta",
  "shirt",
  "trousers",
  "lehenga",
  "alteration",
  "other",
] as const;

export type GarmentIllustrationId = (typeof garmentIllustrationIds)[number];
