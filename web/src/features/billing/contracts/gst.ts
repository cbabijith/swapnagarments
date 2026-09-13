import { z } from "zod";
import { id } from "@/shared/contracts/fields";

const gstFields = {
  rateBps: z.number().int().min(0).max(10_000),
  priceMode: z.enum(["exclusive", "inclusive"]),
  gstin: z
    .string()
    .trim()
    .toUpperCase()
    .regex(
      /^$|^[0-9A-Z]{15}$/,
      "Enter a 15-character GSTIN, or leave it blank.",
    ),
};

export const gstSettingsSchema = z.strictObject({
  enabled: z.boolean(),
  ...gstFields,
});
export const gstSnapshotSchema = z.strictObject({
  ...gstFields,
  amount: z.number().int().min(0).max(100_000_000),
  taxableAmount: z.number().int().min(0).max(100_000_000),
});
export const applyGstSchema = z.object({
  type: z.literal("billing.apply-gst"),
  orderId: id,
  settings: gstSettingsSchema,
});
export type GstSettings = z.infer<typeof gstSettingsSchema>;
export type GstSnapshot = z.infer<typeof gstSnapshotSchema>;
