import { sql } from "drizzle-orm";
import {
  pgTable,
  jsonb,
  text,
  integer,
  timestamp,
  date,
  index,
  unique,
  check,
} from "drizzle-orm/pg-core";
import { workspaces } from "./workspace";
import { customers } from "./customers";
import type { OrderStatus, Priority } from "@/features/orders/types";

export const orders = pgTable(
  "sg_orders",
  {
    id: text().primaryKey(),
    workspaceId: integer("workspace_id")
      .notNull()
      .default(1)
      .references(() => workspaces.id),
    position: integer().notNull(),
    number: text().notNull(),
    customerId: text("customer_id")
      .notNull()
      .references(() => customers.id),
    priority: text().$type<Priority>().notNull(),
    dueDate: date("due_date", { mode: "string" }).notNull(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    status: text().$type<OrderStatus>().notNull(),
    notes: text().notNull(),
    deliveredAt: timestamp("delivered_at", {
      withTimezone: true,
      mode: "string",
    }),
  },
  (t) => [
    unique("sg_orders_shop_number").on(t.workspaceId, t.number),
    index("sg_orders_customer").on(t.customerId),
    index("sg_orders_status_due").on(t.status, t.dueDate, t.priority, t.id),
    check(
      "sg_orders_priority_check",
      sql`${t.priority} IN ('normal', 'high', 'urgent')`,
    ),
    check(
      "sg_orders_status_check",
      sql`${t.status} IN ('received', 'in_progress', 'ready', 'delivered', 'cancelled')`,
    ),
    check("sg_orders_position_check", sql`${t.position} >= 0`),
  ],
);

export const orderItems = pgTable(
  "sg_order_items",
  {
    work: jsonb().$type<import("@/features/team/contracts/team").PieceWork>(),
    workflow:
      jsonb().$type<
        import("@/features/workflow/contracts/settings").PieceWorkflow
      >(),
    design:
      jsonb().$type<
        import("@/features/design-library/contracts").DesignSnapshot
      >(),
    measurement:
      jsonb().$type<
        import("@/features/measurements/contracts/profiles").MeasurementSnapshot
      >(),
    measurementHistory: jsonb("measurement_history").$type<
      import("@/features/measurements/contracts/profiles").MeasurementSnapshot[]
    >(),
    id: text().primaryKey(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id),
    position: integer().notNull(),
    garment: text().notNull(),
    material: text().notNull(),
    station: integer().notNull(),
    price: integer().notNull(),
  },
  (t) => [
    unique("sg_order_items_id_order").on(t.id, t.orderId),
    index("sg_order_items_order").on(t.orderId),
    index("sg_order_items_station").on(t.station, t.orderId),
    check("sg_order_items_station_check", sql`${t.station} BETWEEN 0 AND 5`),
    check(
      "sg_order_items_price_check",
      sql`${t.price} BETWEEN 1 AND 100000000`,
    ),
    check("sg_order_items_position_check", sql`${t.position} >= 0`),
  ],
);
