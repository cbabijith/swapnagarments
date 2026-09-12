import "server-only";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";
import { migrate } from "./migrate";

const state = globalThis as unknown as {
  swapnaPool?: Pool;
  swapnaSchema?: Promise<void>;
};
export function database() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_NOT_CONFIGURED");
  if (!state.swapnaPool) {
    state.swapnaPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 8_000,
      statement_timeout: 12_000,
      ...(process.env.DATABASE_SSL_CA
        ? { ssl: { ca: process.env.DATABASE_SSL_CA, rejectUnauthorized: true } }
        : {}),
    });
    state.swapnaPool.on("error", () => {
      console.error("PostgreSQL connection interrupted.");
    });
  }
  return state.swapnaPool;
}

export function db() {
  return drizzle(database(), { schema });
}

export type DatabaseTransaction = Parameters<
  Parameters<ReturnType<typeof db>["transaction"]>[0]
>[0];

/** Additive versioned migrations preserve the existing owner, sessions and shop data. */
export async function ensureSchema() {
  if (!state.swapnaSchema) {
    state.swapnaSchema = migrate(database()).catch((error) => {
      state.swapnaSchema = undefined;
      throw error;
    });
  }
  return state.swapnaSchema;
}
