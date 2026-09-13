import { test } from "node:test";
import assert from "node:assert/strict";
import { isolatedDatabase } from "./helpers/isolated-database";
import { migrate } from "../src/db/migrate";
import { defaultCatalogue } from "../src/features/settings/domain/catalogue";
import { garmentSchema } from "../src/features/settings/contracts/catalogue";
import { resolveGarmentIllustration } from "../src/features/settings/domain/garment-illustrations";

test("existing garment names receive distinct images; custom choices override automatic matching", () => {
  assert.deepEqual(
    defaultCatalogue().garments.map(resolveGarmentIllustration),
    ["blouse", "churidar", "gown", "skirt", "pavada", "other"],
  );
  assert.equal(
    resolveGarmentIllustration({ name: "  SALWAR   KAMEEZ " }),
    "churidar",
  );
  assert.equal(
    resolveGarmentIllustration({
      name: "Pavada & davani copy",
      illustrationId: "pavada",
    }),
    "pavada",
  );
  assert.equal(
    resolveGarmentIllustration({
      name: "Designer special",
      illustrationId: "lehenga",
    }),
    "lehenga",
  );
  assert.equal(
    resolveGarmentIllustration({ name: "Unknown service" }),
    "other",
  );
  assert.equal(resolveGarmentIllustration({ name: "constructor" }), "other");
  assert.equal(
    garmentSchema.safeParse({
      ...defaultCatalogue().garments[0],
      illustrationId: "https://example.test/image.svg",
    }).success,
    false,
  );
});

test("migration 5 preserves a populated version 4 catalogue and leaves old image choices absent", async () => {
  const { engine, pool } = isolatedDatabase();
  try {
    await migrate(pool);
    // Reconstruct the immediately previous schema, including an existing catalogue row.
    await engine.exec(
      "ALTER TABLE sg_garments DROP COLUMN illustration_id; DELETE FROM sg_schema_migrations WHERE version = 5;",
    );
    const garment = defaultCatalogue().garments[0];
    await engine.query(
      "INSERT INTO sg_garments(id, position, name, revision, active, price, unit, fields, presets) VALUES ($1, 0, $2, 7, true, 85000, 'in', $3::jsonb, $4::jsonb)",
      [
        garment.id,
        garment.name,
        JSON.stringify(garment.fields),
        JSON.stringify(garment.presets),
      ],
    );
    await engine.exec(
      "INSERT INTO sg_shop_settings(workspace_id, revision, default_garment_id, lead_days) VALUES (1, 11, 'garment-blouse', 7)",
    );
    const before = (
      await engine.query<Record<string, unknown>>("SELECT * FROM sg_garments")
    ).rows[0];
    const settings = (await engine.query("SELECT * FROM sg_shop_settings"))
      .rows;
    const workspace = (await engine.query("SELECT * FROM sg_workspace")).rows;
    await migrate(pool);
    await migrate(pool);
    assert.deepEqual((await engine.query("SELECT * FROM sg_garments")).rows, [
      { ...before, illustration_id: null },
    ]);
    assert.deepEqual(
      (await engine.query("SELECT * FROM sg_shop_settings")).rows,
      settings,
    );
    assert.deepEqual(
      (await engine.query("SELECT * FROM sg_workspace")).rows,
      workspace,
    );
    assert.equal(
      (
        await engine.query(
          "SELECT * FROM sg_schema_migrations WHERE version = 5",
        )
      ).rows.length,
      1,
    );
  } finally {
    await engine.close();
  }
});
