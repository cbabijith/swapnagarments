import { z } from "zod";
import { directoryQuery } from "@/shared/contracts/query-input";
import { billingFilter } from "@/features/billing/contracts/query";
export const ordersQuery = directoryQuery.extend({
  filter: z
    .enum([
      "all",
      "active",
      "due",
      "overdue",
      "received",
      "in_progress",
      "ready",
      "delivered",
      "cancelled",
    ])
    .default("all"),
  priority: z.enum(["all", "normal", "high", "urgent"]).default("all"),
  customerId: z.string().min(1).max(200).optional(),
});
export const exportQuery = ordersQuery.extend({
  scope: z.enum(["orders", "billing"]).default("orders"),
  billingFilter,
});
export type OrdersQuery = z.infer<typeof ordersQuery>;
