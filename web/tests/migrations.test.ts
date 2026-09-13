import { test } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import type { Pool } from "pg";
import { baseline } from "../src/db/migrations/0001-baseline";
import { migrate } from "../src/db/migrate";
import { createPreviewWorkspace } from "../src/shared/workspace";

test("versioned baseline preserves existing owner, sessions, measurements, payments and retry records", async () => {
  const engine = new PGlite();
  const query = async (sql: string, values?: unknown[]) => {
    const result = values
      ? await engine.query(sql, values)
      : (await engine.exec(sql)).at(-1)!;
    return { ...result, rowCount: result.affectedRows || result.rows.length };
  };
  const pool = {
    connect: async () => ({ query, release() {} }),
  } as unknown as Pool;
  try {
    await engine.exec(baseline);
    const data = createPreviewWorkspace();
    data.customers[0].measurementHistory = [
      { date: "2026-01-01T00:00:00.000Z", values: { Bust: "34" } },
    ];
    await query(
      "INSERT INTO sg_owner(id, name, email, password_hash, salt) VALUES (1, 'Existing owner', 'existing@example.test', 'preserved-password-hash', 'preserved-salt')",
    );
    await query(
      "INSERT INTO sg_sessions(token_hash, owner_id, expires_at) VALUES ('preserved-session', 1, '2030-01-01Z')",
    );
    await query(
      "INSERT INTO sg_workspace(id, revision, data) VALUES (1, 47, $1::jsonb)",
      [JSON.stringify(data)],
    );
    const mutationId = crypto.randomUUID();
    await query("INSERT INTO sg_mutations(id, result_id) VALUES ($1, $2)", [
      mutationId,
      data.orders[0].id,
    ]);
    const before = await engine.query("SELECT * FROM sg_owner");
    await migrate(pool);
    await migrate(pool);
    assert.deepEqual(
      (await engine.query("SELECT * FROM sg_owner")).rows,
      before.rows,
    );
    const saved = await engine.query<{ data: unknown; revision: number }>(
      "SELECT data, revision FROM sg_workspace",
    );
    assert.deepEqual(saved.rows[0].data, data);
    assert.equal(saved.rows[0].revision, 47);
    assert.equal(
      (await engine.query("SELECT * FROM sg_sessions")).rows.length,
      1,
    );
    const mutations = await engine.query<{
      result_id: string;
      fingerprint: null;
    }>("SELECT * FROM sg_mutations");
    assert.equal(mutations.rows[0].result_id, data.orders[0].id);
    assert.equal(mutations.rows[0].fingerprint, null);
    assert.equal(
      (await engine.query("SELECT * FROM sg_schema_migrations")).rows.length,
      5,
    );
    await engine.exec(
      "UPDATE sg_schema_migrations SET checksum = 'unexpected-change' WHERE version = 1",
    );
    await assert.rejects(migrate(pool), /checksum mismatch/);
    assert.deepEqual(
      (await engine.query<{ data: unknown }>("SELECT data FROM sg_workspace"))
        .rows[0].data,
      data,
    );
  } finally {
    await engine.close();
  }
});
