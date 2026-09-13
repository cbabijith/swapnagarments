import {
  assetRefSchema,
  designConfigSchema,
} from "@/features/design-library/contracts";
import { z } from "zod";
import { measurementGuideIds } from "@/features/measurements/contracts/guide";
import { garmentIllustrationIds } from "./garment-illustration";

export const fieldSchema = z.strictObject({
  id: z.string().min(1).max(100),
  label: z.string().trim().min(1).max(80),
  type: z.enum(["number", "text", "select"]),
  required: z.boolean(),
  help: z.string().max(300),
  options: z.array(z.string().trim().min(1).max(80)).max(30),
  guideId: z.enum(["none", ...measurementGuideIds]).optional(),
});
export const measurementValuesSchema = z.record(
  z.string().min(1).max(100),
  z.string().max(500),
);
export const garmentSchema = z.strictObject({
  id: z.string().min(1).max(100),
  revision: z.number().int().min(1),
  name: z.string().trim().min(1).max(100),
  illustrationId: z.enum(garmentIllustrationIds).optional(),
  image: assetRefSchema.optional(),
  referenceImages: z.array(assetRefSchema).max(4).optional(),
  designConfig: designConfigSchema.optional(),
  active: z.boolean(),
  price: z.number().int().min(1).max(100_000_000).nullable(),
  unit: z.enum(["in", "cm"]),
  fields: z.array(fieldSchema).max(30),
  presets: z
    .array(
      z.strictObject({
        id: z.string().min(1).max(100),
        name: z.string().trim().min(1).max(80),
        values: measurementValuesSchema,
      }),
    )
    .max(20),
});
export const catalogueSchema = z.strictObject({
  revision: z.number().int().min(0),
  defaultGarmentId: z.string().max(100),
  leadDays: z.number().int().min(0).max(365),
  garments: z.array(garmentSchema).min(1).max(50),
});
export const saveCatalogueSchema = z.object({
  type: z.literal("settings.save"),
  catalogue: catalogueSchema,
});
export type MeasurementField = z.infer<typeof fieldSchema>;
export type Garment = z.infer<typeof garmentSchema>;
export type Catalogue = z.infer<typeof catalogueSchema>;
