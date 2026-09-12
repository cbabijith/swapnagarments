import { pgTable, text, integer } from "drizzle-orm/pg-core";
import { workspaces } from "./workspace";

export const staff = pgTable("sg_staff", {
  id: text().primaryKey(),
  workspaceId: integer("workspace_id")
    .notNull()
    .default(1)
    .references(() => workspaces.id),
  position: integer().notNull(),
  name: text().notNull(),
  role: text().notNull(),
  station: text().notNull(),
  color: text().notNull(),
});
