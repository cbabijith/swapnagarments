import { sql } from "drizzle-orm";
import {
  pgTable,
  integer,
  text,
  timestamp,
  uuid,
  jsonb,
  check,
  boolean,
} from "drizzle-orm/pg-core";
import type { Workspace } from "@/shared/workspace";

/** Legacy snapshot retained during the staged migration. Never store a client snapshot. */
export const workspaces = pgTable(
  "sg_workspace",
  {
    id: integer().primaryKey(),
    revision: integer().notNull().default(0),
    data: jsonb().$type<Workspace>().notNull(),
    storageModel: text("storage_model", { enum: ["json", "relational"] })
      .notNull()
      .default("json"),
    hasDayReports: boolean("has_day_reports").notNull().default(true),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    check("sg_workspace_id_check", sql`${t.id} = 1`),
    check(
      "sg_workspace_storage_model_check",
      sql`${t.storageModel} IN ('json', 'relational')`,
    ),
  ],
);
export const mutations = pgTable("sg_mutations", {
  id: uuid().primaryKey(),
  resultId: text("result_id"),
  fingerprint: text(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
});
