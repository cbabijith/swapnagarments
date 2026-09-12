import "server-only";
import { Pool } from "pg";
import { emptyWorkspace } from "@/lib/workspace";

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

/** Creates only app-owned tables. It never drops or modifies any existing shop tables. */
export async function ensureSchema() {
  if (!state.swapnaSchema)
    state.swapnaSchema = (async () => {
      const client = await database().connect();
      try {
        await client.query("BEGIN");
        await client.query("SELECT pg_advisory_xact_lock(1937146201)");
        await client.query(`CREATE TABLE IF NOT EXISTS sg_owner (id integer PRIMARY KEY CHECK (id = 1), name text NOT NULL, email text NOT NULL, password_hash text NOT NULL, salt text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
        CREATE TABLE IF NOT EXISTS sg_sessions (token_hash text PRIMARY KEY, owner_id integer NOT NULL REFERENCES sg_owner(id), expires_at timestamptz NOT NULL);
        CREATE INDEX IF NOT EXISTS sg_sessions_expiry ON sg_sessions(expires_at);
        CREATE TABLE IF NOT EXISTS sg_workspace (id integer PRIMARY KEY CHECK (id = 1), revision integer NOT NULL DEFAULT 0, data jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now());
        CREATE TABLE IF NOT EXISTS sg_mutations (id uuid PRIMARY KEY, result_id text, created_at timestamptz NOT NULL DEFAULT now());
        CREATE TABLE IF NOT EXISTS sg_auth_limits (bucket text PRIMARY KEY, attempts integer NOT NULL, expires_at timestamptz NOT NULL);`);
        await client.query(
          "INSERT INTO sg_workspace (id, data) VALUES (1, $1::jsonb) ON CONFLICT (id) DO NOTHING",
          [JSON.stringify(emptyWorkspace())],
        );
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    })().catch((error) => {
      state.swapnaSchema = undefined;
      throw error;
    });
  return state.swapnaSchema;
}
