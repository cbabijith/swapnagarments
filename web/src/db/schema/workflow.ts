import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  uuid,
  integer,
  timestamp,
  index,
  foreignKey,
  unique,
  check,
  jsonb,
} from "drizzle-orm/pg-core";
import { orderItems } from "./orders";
import { mutations } from "./workspace";

export const workflowHistory = pgTable(
  "sg_workflow_history",
  {
    id: uuid().primaryKey(),
    orderId: text("order_id").notNull(),
    pieceId: text("piece_id").notNull(),
    mutationId: uuid("mutation_id").references(() => mutations.id),
    kind: text()
      .$type<"baseline" | "created" | "advance" | "rework">()
      .notNull(),
    fromStep: jsonb("from_step").$type<{
      id: string;
      name: string;
      position: number;
    }>(),
    toStep: jsonb("to_step").$type<{
      id: string;
      name: string;
      position: number;
    }>(),
    fromStation: integer("from_station"),
    toStation: integer("to_station").notNull(),
    reason: text().notNull(),
    actor: text().notNull(),
    occurredAt: timestamp("occurred_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
  },
  (t) => [
    foreignKey({
      columns: [t.pieceId, t.orderId],
      foreignColumns: [orderItems.id, orderItems.orderId],
    }),
    unique("sg_workflow_history_command_piece").on(t.mutationId, t.pieceId),
    index("sg_workflow_history_piece_time").on(t.pieceId, t.occurredAt),
    check(
      "sg_workflow_history_kind_check",
      sql`${t.kind} IN ('baseline', 'created', 'advance', 'rework')`,
    ),
    check(
      "sg_workflow_history_station_check",
      sql`${t.toStation} BETWEEN 0 AND 5 AND (${t.fromStation} IS NULL OR ${t.fromStation} BETWEEN 0 AND 5)`,
    ),
  ],
);
