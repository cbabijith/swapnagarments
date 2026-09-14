import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { mutations } from "./workspace";

/** Immutable work receipts survive stage changes and either workspace storage mode. */
export const workCompletions = pgTable(
  "sg_work_completions",
  {
    id: uuid().primaryKey(),
    mutationId: uuid("mutation_id")
      .notNull()
      .references(() => mutations.id),
    workerId: text("worker_id").notNull(),
    orderId: text("order_id").notNull(),
    orderNumber: text("order_number").notNull(),
    pieceId: text("piece_id").notNull(),
    garment: text().notNull(),
    station: integer().notNull(),
    stepName: text("step_name").notNull(),
    completedAt: timestamp("completed_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
  },
  (t) => [
    unique("sg_work_completions_command_piece").on(t.mutationId, t.pieceId),
    index("sg_work_completions_worker_time").on(
      t.workerId,
      t.completedAt.desc(),
      t.id.desc(),
    ),
    check(
      "sg_work_completions_station_check",
      sql`${t.station} BETWEEN 0 AND 4`,
    ),
  ],
);
