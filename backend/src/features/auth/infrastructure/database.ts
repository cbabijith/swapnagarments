import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

export type DrizzleDb = ReturnType<typeof createDatabase>;

/**
 * SQLite-backed Drizzle instance. SQLite (a single file) is the lightest real
 * persistence for auth during this phase; migrating to PostgreSQL later is a
 * driver + schema dialect change confined to this folder.
 */
export function createDatabase(databaseFile: string) {
  fs.mkdirSync(path.dirname(path.resolve(databaseFile)), { recursive: true });
  const sqlite = new Database(databaseFile);
  return drizzle(sqlite, { schema });
}
