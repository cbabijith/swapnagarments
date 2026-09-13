import { z } from "zod";

export const detailKinds = [
  "front-neck",
  "back",
  "sleeve-shape",
  "sleeve-length",
  "collar",
  "closure",
  "hem",
  "construction",
  "pocket",
  "cuff",
] as const;
export const assetKinds = ["garment", ...detailKinds, "reference"] as const;
export const kindLabels: Record<AssetKind, string> = {
  garment: "Garment models",
  "front-neck": "Front neck",
  back: "Back design",
  "sleeve-shape": "Sleeve shape",
  "sleeve-length": "Sleeve length",
  collar: "Collar",
  closure: "Opening & fastening",
  hem: "Hem",
  construction: "Cut & seams",
  pocket: "Pocket",
  cuff: "Cuff",
  reference: "Reference photos",
};
export const assetId = z
  .string()
  .regex(/^(garment|detail|upload)-[a-z0-9-]{1,110}$/);
export const assetRefSchema = z.strictObject({
  id: assetId,
  label: z.string().trim().min(1).max(100),
  kind: z.enum(assetKinds),
  view: z.enum(["front", "back", "detail", "reference"]),
});
export type AssetRef = z.infer<typeof assetRefSchema>;
export type AssetKind = (typeof assetKinds)[number];
export type DetailKind = (typeof detailKinds)[number];
export type DesignAsset = AssetRef & {
  family: string;
  aliases: string[];
  source: "builtin" | "upload";
  active: boolean;
  favourite: boolean;
  revision: number;
};
export const choicesSchema = z
  .partialRecord(z.enum(detailKinds), assetId)
  .refine((v) => Object.keys(v).length <= 10);
export const designConfigSchema = z.strictObject({
  groups: z
    .array(
      z.strictObject({
        kind: z.enum(detailKinds),
        assetIds: z.array(assetId).max(40),
      }),
    )
    .max(10),
  presets: z
    .array(
      z.strictObject({
        id: z.string().min(1).max(100),
        name: z.string().trim().min(1).max(80),
        choices: choicesSchema,
      }),
    )
    .max(12),
});
export const designInputSchema = z.strictObject({
  choices: choicesSchema,
  references: z.array(assetId).max(4),
  notes: z.string().max(1000),
});
export const designSnapshotSchema = z.strictObject({
  garmentImage: assetRefSchema.optional(),
  garmentReferences: z.array(assetRefSchema).max(4),
  choices: z.array(assetRefSchema).max(10),
  references: z.array(assetRefSchema).max(4),
  notes: z.string().max(1000),
});
export type DesignConfig = z.infer<typeof designConfigSchema>;
export type DesignInput = z.infer<typeof designInputSchema>;
export type DesignSnapshot = z.infer<typeof designSnapshotSchema>;
export const libraryQuerySchema = z.object({
  ids: z.string().max(6000).default(""),
  q: z.string().max(100).default(""),
  kind: z.enum(["all", ...assetKinds]).default("all"),
  family: z.string().max(80).default(""),
  source: z.enum(["all", "upload", "favourite", "archived"]).default("all"),
  page: z.coerce.number().int().min(1).max(10000).default(1),
});
export type LibraryQuery = z.infer<typeof libraryQuerySchema>;
export type LibraryPage = {
  items: DesignAsset[];
  total: number;
  page: number;
  pageCount: number;
  builtinOverrides?: DesignAsset[];
  uploadTotal?: number;
};
export const assetUpdateSchema = z.strictObject({
  id: assetId,
  revision: z.number().int().min(0),
  active: z.boolean().optional(),
  favourite: z.boolean().optional(),
});
export const uploadMetadataSchema = z.strictObject({
  id: z.uuid(),
  label: z.string().trim().min(1).max(100),
  kind: z.enum(assetKinds),
  view: z.enum(["front", "back", "detail", "reference"]),
});
export const toAssetRef = ({ id, label, kind, view }: AssetRef): AssetRef => ({
  id,
  label,
  kind,
  view,
});
