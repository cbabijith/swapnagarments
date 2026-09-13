import {
  pgTable,
  text,
  integer,
  jsonb,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import type {
  Worker,
  AssignmentSettings,
} from "@/features/team/contracts/team";
import { workspaces } from "./workspace";

export const staff = pgTable("sg_staff", {
  worker: jsonb().$type<Worker>(),
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

export const assignmentSettings = pgTable("sg_assignment_settings", {
  workspaceId: integer("workspace_id")
    .primaryKey()
    .references(() => workspaces.id),
  settings: jsonb().$type<AssignmentSettings>().notNull(),
});
// Accounts are independent of storage mode; JSON rollback must preserve logins.
export const workerAccounts = pgTable("sg_worker_accounts", {
  staffId: text("staff_id").primaryKey(),
  name: text().notNull(),
  email: text().notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  salt: text().notNull(),
  active: boolean().notNull().default(true),
});
export const workerSessions = pgTable(
  "sg_worker_sessions",
  {
    tokenHash: text("token_hash").primaryKey(),
    staffId: text("staff_id")
      .notNull()
      .references(() => workerAccounts.staffId),
    expiresAt: timestamp("expires_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
  },
  (t) => [index("sg_worker_sessions_expiry").on(t.expiresAt)],
);
