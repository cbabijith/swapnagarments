import { sql } from "drizzle-orm";
import {
  pgTable,
  date,
  text,
  integer,
  bigint,
  timestamp,
  check,
} from "drizzle-orm/pg-core";
import { workspaces } from "./workspace";

export const closedDays = pgTable("sg_closed_days", {
  date: date({ mode: "string" }).primaryKey(),
  position: integer().notNull(),
  workspaceId: integer("workspace_id")
    .notNull()
    .default(1)
    .references(() => workspaces.id),
});
export const dayReports = pgTable(
  "sg_day_reports",
  {
    date: date({ mode: "string" })
      .primaryKey()
      .references(() => closedDays.date),
    position: integer().notNull(),
    reviewedBy: text("reviewed_by").notNull(),
    reviewedAt: timestamp("reviewed_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    delivered: integer().notNull(),
    ready: integer().notNull(),
    unfinished: integer().notNull(),
    collected: bigint({ mode: "number" }).notNull(),
    pending: bigint({ mode: "number" }).notNull(),
  },
  (t) => [
    check(
      "sg_day_reports_values_check",
      sql`${t.delivered} >= 0 AND ${t.ready} >= 0 AND ${t.unfinished} >= 0 AND ${t.collected} BETWEEN 0 AND 9007199254740991 AND ${t.pending} BETWEEN 0 AND 9007199254740991`,
    ),
  ],
);
