import { z } from "zod";
import { id } from "@/shared/contracts/fields";
import { measurementsSchema } from "@/features/measurements/contracts/measurements";

export const customerSchema = z.object({
  id,
  name: z.string().trim().min(1).max(100),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[\d\s-]{10,16}$/),
  email: z.union([z.literal(""), z.email().max(150)]),
  notes: z.string().max(2000),
  measurements: measurementsSchema,
});
export const saveCustomerSchema = z.object({
  type: z.literal("customer.save"),
  customer: customerSchema,
});
