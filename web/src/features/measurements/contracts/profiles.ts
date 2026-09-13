import { z } from "zod";
import { id } from "@/shared/contracts/fields";
import {
  fieldSchema,
  measurementValuesSchema,
} from "@/features/settings/contracts/catalogue";

export const snapshotSchema = z.strictObject({
  garmentId: z.string().min(1).max(100),
  garmentRevision: z.number().int().min(1),
  garmentName: z.string().min(1).max(100),
  revision: z.number().int().min(1),
  unit: z.enum(["in", "cm"]),
  fields: z.array(fieldSchema).max(40),
  values: measurementValuesSchema,
  source: z.enum(["new", "profile", "preset", "legacy"]),
  confirmed: z.boolean(),
  recordedAt: z.iso.datetime({ offset: true }),
  recordedBy: z.string(),
});
export const profileSchema = z.strictObject({
  garmentId: z.string(),
  revision: z.number().int().min(1),
  snapshot: snapshotSchema,
  history: z.array(snapshotSchema),
});
export const measurementInputSchema = z.object({
  values: measurementValuesSchema,
  extraFields: z.array(fieldSchema).max(10),
  source: z.enum(["new", "profile", "preset", "legacy"]),
  confirmed: z.boolean(),
  saveProfile: z.boolean(),
  expectedProfileRevision: z.number().int().min(0),
});
export const saveProfileSchema = z.object({
  type: z.literal("measurement.save"),
  customerId: id,
  garmentId: z.string().min(1).max(100),
  garmentRevision: z.number().int().min(1),
  measurements: measurementInputSchema,
});
export const savePieceMeasurementsSchema = z.object({
  type: z.literal("piece.measurements"),
  orderId: id,
  pieceId: id,
  expectedRevision: z.number().int().min(1),
  values: measurementValuesSchema,
});
export type MeasurementSnapshot = z.infer<typeof snapshotSchema>;
export type MeasurementProfile = z.infer<typeof profileSchema>;
export type MeasurementInput = z.infer<typeof measurementInputSchema>;
