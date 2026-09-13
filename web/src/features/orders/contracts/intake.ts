import { designInputSchema } from "@/features/design-library/contracts";
import { z } from "zod";
import { id, amount, method, date } from "@/shared/contracts/fields";
import { measurementInputSchema } from "@/features/measurements/contracts/profiles";
export const intakeSchema = z.object({
  type: z.literal("order.intake"),
  customer: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("existing"), id }),
    z.object({
      kind: z.literal("new"),
      name: z.string().trim().min(1).max(100),
      phone: z
        .string()
        .trim()
        .regex(/^\+?[\d\s-]{10,16}$/),
      email: z.union([z.literal(""), z.email().max(150)]),
      notes: z.string().max(2000),
    }),
  ]),
  items: z
    .array(
      z.object({
        garmentId: z.string().min(1).max(100),
        garmentRevision: z.number().int().min(1),
        quantity: z.number().int().min(1).max(50),
        price: amount.min(1),
        material: z.string().max(500),
        measurements: measurementInputSchema,
        design: designInputSchema.optional(),
      }),
    )
    .min(1)
    .max(50),
  dueDate: date,
  priority: z.enum(["normal", "high", "urgent"]),
  notes: z.string().max(2000),
  advance: amount,
  method,
});
export type Intake = z.infer<typeof intakeSchema>;
