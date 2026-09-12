import { z } from "zod";
import { id, amount, method, date } from "@/shared/contracts/fields";
import { GARMENTS } from "@/shared/workspace";

export const createOrderSchema = z.object({
  type: z.literal("order.create"),
  customerId: id,
  items: z
    .array(
      z.object({
        garment: z.enum(GARMENTS),
        material: z.string().max(500),
        price: amount.min(1),
      }),
    )
    .min(1)
    .max(50),
  priority: z.enum(["normal", "high", "urgent"]),
  dueDate: date,
  notes: z.string().max(2000),
  advance: amount,
  method,
});
export const deliverOrderSchema = z.object({
  type: z.literal("order.deliver"),
  orderId: id,
});
