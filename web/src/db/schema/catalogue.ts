import {
  pgTable,
  integer,
  text,
  boolean,
  jsonb,
  primaryKey,
} from "drizzle-orm/pg-core";
import { workspaces } from "./workspace";
import { customers } from "./customers";
import type { Garment } from "@/features/settings/contracts/catalogue";
import type { MeasurementProfile } from "@/features/measurements/contracts/profiles";

export const shopSettings = pgTable("sg_shop_settings", {
  workspaceId: integer("workspace_id")
    .primaryKey()
    .references(() => workspaces.id),
  revision: integer().notNull(),
  defaultGarmentId: text("default_garment_id").notNull(),
  leadDays: integer("lead_days").notNull(),
});
export const garments = pgTable("sg_garments", {
  id: text().primaryKey(),
  workspaceId: integer("workspace_id")
    .notNull()
    .default(1)
    .references(() => workspaces.id),
  position: integer().notNull(),
  name: text().notNull(),
  revision: integer().notNull(),
  active: boolean().notNull(),
  price: integer(),
  unit: text().$type<"in" | "cm">().notNull(),
  fields: jsonb().$type<Garment["fields"]>().notNull(),
  presets: jsonb().$type<Garment["presets"]>().notNull(),
});
export const customerProfiles = pgTable(
  "sg_measurement_profiles",
  {
    position: integer().notNull(),
    customerId: text("customer_id")
      .notNull()
      .references(() => customers.id),
    garmentId: text("garment_id")
      .notNull()
      .references(() => garments.id),
    profile: jsonb().$type<MeasurementProfile>().notNull(),
  },
  (t) => [primaryKey({ columns: [t.customerId, t.garmentId] })],
);
