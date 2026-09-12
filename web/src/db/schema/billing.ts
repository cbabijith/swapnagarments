import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  integer,
  timestamp,
  index,
  check,
} from "drizzle-orm/pg-core";
import { orders } from "./orders";

export const payments = pgTable(
  "sg_payments",
  {
    id: text().primaryKey(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id),
    position: integer().notNull(),
    amount: integer().notNull(),
    method: text().notNull(),
    paidAt: timestamp("paid_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
  },
  (t) => [
    index("sg_payments_order_date").on(t.orderId, t.paidAt),
    index("sg_payments_date").on(t.paidAt),
    check("sg_payments_amount_check", sql`${t.amount} BETWEEN 1 AND 100000000`),
    check("sg_payments_position_check", sql`${t.position} >= 0`),
  ],
);
