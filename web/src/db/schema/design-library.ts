import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { workspaces } from "./workspace";
import type { AssetKind, AssetRef } from "@/features/design-library/contracts";

// Built-ins have immutable public artwork and only shop preferences here.
// Upload IDs identify immutable processed files; archiving never removes files.
export const designAssets = pgTable(
  "sg_design_assets",
  {
    id: text().primaryKey(),
    workspaceId: integer("workspace_id")
      .notNull()
      .default(1)
      .references(() => workspaces.id),
    source: text().$type<"builtin" | "upload">().notNull(),
    label: text().notNull(),
    kind: text().$type<AssetKind>().notNull(),
    view: text().$type<AssetRef["view"]>().notNull(),
    active: boolean().notNull().default(true),
    favourite: boolean().notNull().default(false),
    revision: integer().notNull().default(1),
    storageKey: text("storage_key"),
    thumbnailKey: text("thumbnail_key"),
    checksum: text(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("sg_design_assets_browse").on(
      t.workspaceId,
      t.source,
      t.active,
      t.kind,
    ),
  ],
);
