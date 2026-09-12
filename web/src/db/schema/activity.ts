import { pgTable, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { orders } from "./orders";

export const activity = pgTable(
  "sg_activity",
  {
    id: text().primaryKey(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id),
    position: integer().notNull(),
    title: text().notNull(),
    detail: text().notNull(),
    time: timestamp({ withTimezone: true, mode: "string" }).notNull(),
    actor: text(),
  },
  (t) => [index("sg_activity_order_time").on(t.orderId, t.time)],
);
