import { sql } from "drizzle-orm";
import {
  pgTable,
  integer,
  text,
  timestamp,
  check,
  index,
} from "drizzle-orm/pg-core";

export const owners = pgTable(
  "sg_owner",
  {
    id: integer().primaryKey(),
    name: text().notNull(),
    email: text().notNull(),
    passwordHash: text("password_hash").notNull(),
    salt: text().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (t) => [check("sg_owner_id_check", sql`${t.id} = 1`)],
);
export const sessions = pgTable(
  "sg_sessions",
  {
    tokenHash: text("token_hash").primaryKey(),
    ownerId: integer("owner_id")
      .notNull()
      .references(() => owners.id),
    expiresAt: timestamp("expires_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
  },
  (t) => [index("sg_sessions_expiry").on(t.expiresAt)],
);
export const authLimits = pgTable("sg_auth_limits", {
  bucket: text().primaryKey(),
  attempts: integer().notNull(),
  expiresAt: timestamp("expires_at", {
    withTimezone: true,
    mode: "string",
  }).notNull(),
});
