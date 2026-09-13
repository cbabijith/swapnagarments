import { pgTable, text, uuid, timestamp, unique } from "drizzle-orm/pg-core";
import { mutations } from "./workspace";

/** Durable identities for future idempotent consumers; no outbound dispatch is enabled. */
export const domainEvents = pgTable(
  "sg_domain_events",
  {
    id: text().primaryKey(),
    mutationId: uuid("mutation_id")
      .notNull()
      .references(() => mutations.id),
    type: text().notNull(),
    resultId: text("result_id"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [unique().on(table.mutationId, table.type)],
);
