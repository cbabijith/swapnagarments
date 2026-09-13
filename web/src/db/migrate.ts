import { designLibrary } from "./migrations/0006-design-library";
import { teamWork } from "./migrations/0007-team-work";
import { customWorkflows } from "./migrations/0008-custom-workflows";
import "server-only";
import { createHash } from "node:crypto";
import type { Pool } from "pg";
import { baseline } from "./migrations/0001-baseline";
import { relationalTables } from "./migrations/0003-relational-tables";
import { catalogueMeasurements } from "./migrations/0004-catalogue-measurements";
import { garmentIllustrations } from "./migrations/0005-garment-illustrations";
import { emptyWorkspace } from "@/shared/workspace";

const migrations = [
  { version: 1, name: "existing_schema_baseline", sql: baseline },
  {
    version: 2,
    name: "command_fingerprints",
    sql: "ALTER TABLE sg_mutations ADD COLUMN IF NOT EXISTS fingerprint text;",
  },
  { version: 3, name: "relational_shop_tables", sql: relationalTables },
  {
    version: 4,
    name: "catalogue_and_order_measurements",
    sql: catalogueMeasurements,
  },
  { version: 5, name: "garment_illustrations", sql: garmentIllustrations },
  { version: 6, name: "design_image_library", sql: designLibrary },
  { version: 7, name: "team_accounts_and_work", sql: teamWork },
  { version: 8, name: "custom_garment_workflows", sql: customWorkflows },
];

/** Every migration and its ledger entry commit together under the original schema lock. */
export async function migrate(pool: Pool) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(1937146201)");
    await client.query(`CREATE TABLE IF NOT EXISTS sg_schema_migrations (
      version integer PRIMARY KEY, name text NOT NULL, checksum text NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT now()
    )`);
    for (const migration of migrations) {
      const checksum = createHash("sha256").update(migration.sql).digest("hex");
      const existing = await client.query<{ checksum: string }>(
        "SELECT checksum FROM sg_schema_migrations WHERE version = $1",
        [migration.version],
      );
      if (existing.rows.length) {
        if (existing.rows[0].checksum !== checksum)
          throw new Error("Applied migration checksum mismatch.");
        continue;
      }
      await client.query(migration.sql);
      await client.query(
        "INSERT INTO sg_schema_migrations(version, name, checksum) VALUES ($1, $2, $3)",
        [migration.version, migration.name, checksum],
      );
    }
    await client.query(
      "INSERT INTO sg_workspace(id, data) VALUES (1, $1::jsonb) ON CONFLICT (id) DO NOTHING",
      [JSON.stringify(emptyWorkspace())],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
