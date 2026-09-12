import { z } from "zod";
import {
  createOrderSchema,
  deliverOrderSchema,
} from "@/features/orders/contracts/order";
import { commandHandler } from "@/shared/server/command-handler";
export const runtime = "nodejs";
export const POST = commandHandler(
  z.object({
    mutationId: z.uuid(),
    action: z.discriminatedUnion("type", [
      createOrderSchema,
      deliverOrderSchema,
    ]),
  }),
);
import { ordersQuery } from "@/features/orders/contracts/query";
import { queryHandler } from "@/shared/server/query-handler";
import { readOrders } from "@/services/order-read-service";
export const GET = queryHandler(ordersQuery, readOrders);
