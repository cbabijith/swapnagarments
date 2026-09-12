import { PGlite } from "@electric-sql/pglite";
import type { Pool } from "pg";

/** Faithful pg query-config adapter, including Drizzle's array rows and date modes. */
export function isolatedDatabase() {
  const engine = new PGlite();
  const query = async (
    input: string | { text: string; rowMode?: string },
    values?: unknown[],
  ) => {
    const statement = typeof input === "string" ? input : input.text;
    const arrayRows = typeof input !== "string" && input.rowMode === "array";
    const options = {
      rowMode: arrayRows ? ("array" as const) : ("object" as const),
    };
    const result = values
      ? await engine.query(statement, values, options)
      : (await engine.exec(statement, options)).at(-1)!;
    const rows = arrayRows
      ? result.rows.map((row) =>
          result.fields.map((field, index) => {
            const value = (row as unknown[])[index];
            if (value instanceof Date)
              return field.dataTypeID === 1082
                ? value.toISOString().slice(0, 10)
                : value.toISOString();
            return value;
          }),
        )
      : result.rows;
    return { rows, rowCount: result.affectedRows || result.rows.length };
  };
  const pool = {
    query,
    connect: async () => ({ query, release() {} }),
    on() {},
    end: async () => engine.close(),
  } as unknown as Pool;
  const state = globalThis as unknown as {
    swapnaPool?: Pool;
    swapnaSchema?: Promise<void>;
  };
  state.swapnaPool = pool;
  state.swapnaSchema = undefined;
  process.env.DATABASE_URL =
    "postgresql://test.invalid/isolated-relational-test";
  return { engine, pool };
}
