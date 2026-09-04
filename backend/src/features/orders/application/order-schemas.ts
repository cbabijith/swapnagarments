import { z } from "zod";
import { GARMENT_TYPES, ORDER_PRIORITIES, ORDER_STATUSES } from "../domain/order";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be a date in YYYY-MM-DD format");

export const createOrderSchema = z.object({
  customerName: z.string().min(2).max(120),
  customerPhone: z.string().min(7).max(20),
  customerEmail: z.email().optional(),
  items: z
    .array(
      z.object({
        garmentType: z.enum(GARMENT_TYPES),
        quantity: z.number().int().min(1).max(100),
        notes: z.string().max(500).optional(),
      }),
    )
    .min(1, "An order needs at least one item.")
    .max(50),
  priority: z.enum(ORDER_PRIORITIES).default("normal"),
  dueDate: isoDate.optional(),
  notes: z.string().max(2000).optional(),
});
export type CreateOrderDto = z.infer<typeof createOrderSchema>;

export const updateOrderStatusSchema = z.object({
  status: z.enum(ORDER_STATUSES),
});
export type UpdateOrderStatusDto = z.infer<typeof updateOrderStatusSchema>;

export const listOrdersSchema = z.object({
  status: z.enum(ORDER_STATUSES).optional(),
  priority: z.enum(ORDER_PRIORITIES).optional(),
});
export type ListOrdersDto = z.infer<typeof listOrdersSchema>;
