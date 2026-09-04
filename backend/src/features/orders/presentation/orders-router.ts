import { Hono } from "hono";
import { getContainer } from "@/core/container";
import { jsonCreated, jsonOk, validateJson, validateQuery } from "@/core/http";
import type { AppEnv } from "@/features/auth";
import {
  createOrderSchema,
  listOrdersSchema,
  updateOrderStatusSchema,
} from "../application/order-schemas";

/**
 * Presentation layer for the orders feature (Hono). Mounted under
 * `/api/v1/orders` behind the auth session middleware.
 */
export const ordersRouter = new Hono<AppEnv>();

ordersRouter.post("/", validateJson(createOrderSchema), async (c) => {
  const dto = c.req.valid("json");
  const actorId = c.get("session").user.id;

  const order = await getContainer().orders.createOrder.run(dto, actorId);
  return jsonCreated(order);
});

ordersRouter.get("/", validateQuery(listOrdersSchema), async (c) => {
  const filter = c.req.valid("query");

  const orders = await getContainer().orders.listOrders.run(filter);
  return jsonOk(orders);
});

ordersRouter.get("/:id", async (c) => {
  const id = c.req.param("id");

  const order = await getContainer().orders.getOrder.run(id);
  return jsonOk(order);
});

ordersRouter.patch("/:id", validateJson(updateOrderStatusSchema), async (c) => {
  const id = c.req.param("id");
  const dto = c.req.valid("json");
  const actorId = c.get("session").user.id;

  const order = await getContainer().orders.updateOrderStatus.run(id, dto, actorId);
  return jsonOk(order);
});
