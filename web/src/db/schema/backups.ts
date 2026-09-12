import {
  pgTable,
  uuid,
  integer,
  text,
  jsonb,
  timestamp,
} from "drizzle-orm/pg-core";
import { workspaces } from "./workspace";
import type { Workspace } from "@/shared/workspace";

export const workspaceBackups = pgTable("sg_workspace_backups", {
  id: uuid().primaryKey(),
  workspaceId: integer("workspace_id")
    .notNull()
    .references(() => workspaces.id),
  revision: integer().notNull(),
  sourceModel: text("source_model").$type<"json" | "relational">().notNull(),
  data: jsonb().$type<Workspace>().notNull(),
  checksum: text().notNull(),
  backupReference: text("backup_reference").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
});
