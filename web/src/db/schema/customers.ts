import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  integer,
  jsonb,
  boolean,
  timestamp,
  primaryKey,
  uniqueIndex,
  check,
} from "drizzle-orm/pg-core";
import { workspaces } from "./workspace";

export const customers = pgTable(
  "sg_customers",
  {
    id: text().primaryKey(),
    workspaceId: integer("workspace_id")
      .notNull()
      .default(1)
      .references(() => workspaces.id),
    position: integer().notNull(),
    name: text().notNull(),
    phone: text().notNull(),
    phoneKey: text("phone_key").notNull(),
    email: text().notNull(),
    notes: text().notNull(),
    measurements: jsonb().$type<Record<string, string>>().notNull(),
    hasMeasurementHistory: boolean("has_measurement_history")
      .notNull()
      .default(false),
  },
  (t) => [
    uniqueIndex("sg_customers_phone_key").on(t.workspaceId, t.phoneKey),
    check("sg_customers_position_check", sql`${t.position} >= 0`),
  ],
);

export const measurementVersions = pgTable(
  "sg_measurement_versions",
  {
    customerId: text("customer_id")
      .notNull()
      .references(() => customers.id),
    version: integer().notNull(),
    recordedAt: timestamp("recorded_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    values: jsonb().$type<Record<string, string>>().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.customerId, t.version] }),
    check("sg_measurement_versions_version_check", sql`${t.version} >= 0`),
  ],
);
