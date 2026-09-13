import { test } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { isolatedDatabase } from "./helpers/isolated-database";
import { ensureSchema } from "../src/db";
import {
  readWorkspace,
  executeWorkspaceCommand,
} from "../src/services/workspace-service";
import { readCatalogue } from "../src/services/catalogue-storage";
import { readWorkflow } from "../src/services/workflow-read-service";
import {
  readCustomer,
  readCustomers,
} from "../src/services/customer-read-service";
import {
  storageStatus,
  transitionWorkspaceStorage,
} from "../src/services/storage-migration-service";
import { validateWorkspace } from "../src/db/workspace-validation";
import { defaultCatalogue } from "../src/features/settings/domain/catalogue";
import { compatibleValues } from "../src/features/measurements/domain/values";
import { shopDate, type Workspace } from "../src/shared/workspace";
import type { WorkspaceMutation } from "../src/shared/contracts/command";
import type { Intake } from "../src/features/orders/contracts/intake";
import type { Catalogue } from "../src/features/settings/contracts/catalogue";
import {
  GET as settingsGet,
  POST as settingsPost,
} from "../src/app/api/settings/route";
import { POST as measurementsPost } from "../src/app/api/measurements/route";

const owner = { name: "Test Owner", email: "owner@example.test" };
const send = (action: WorkspaceMutation, mutationId = crypto.randomUUID()) =>
  executeWorkspaceCommand({ action, mutationId }, owner);
async function setup(relational = true) {
  const context = isolatedDatabase();
  await ensureSchema();
  await context.engine.query(
    "INSERT INTO sg_owner(id, name, email, password_hash, salt) VALUES (1, $1, $2, 'isolated-hash', 'isolated-salt')",
    [owner.name, owner.email],
  );
  if (relational) await transition("cutover");
  return context;
}
async function transition(direction: "cutover" | "rollback") {
  const status = await storageStatus();
  return transitionWorkspaceStorage({
    direction,
    expectedRevision: status.revision,
    expectedChecksum: status.checksum,
    backupReference: "isolated-test-backup",
  });
}
function customCatalogue(): Catalogue {
  const catalogue = defaultCatalogue();
  catalogue.defaultGarmentId = "test-kurta";
  catalogue.leadDays = 5;
  catalogue.garments.push({
    id: "test-kurta",
    revision: 1,
    name: "Custom kurta",
    active: true,
    price: 65000,
    unit: "in",
    fields: [
      {
        id: "length",
        label: "Finished length",
        type: "number",
        required: true,
        help: "Shoulder to hem",
        options: [],
      },
      {
        id: "fit",
        label: "Fit",
        type: "select",
        required: true,
        help: "",
        options: ["Regular", "Loose"],
      },
      {
        id: "style",
        label: "Stitching instructions",
        type: "text",
        required: false,
        help: "",
        options: [],
      },
    ],
    presets: [
      { id: "medium", name: "M", values: { length: "38.5", fit: "Regular" } },
    ],
  });
  return catalogue;
}
function intake(): Intake {
  return {
    type: "order.intake",
    customer: {
      kind: "new",
      name: "Test Customer",
      phone: "9876543210",
      email: "",
      notes: "",
    },
    dueDate: shopDate(),
    priority: "normal",
    notes: "Match the supplied sample",
    advance: 50000,
    method: "UPI",
    items: [
      {
        garmentId: "test-kurta",
        garmentRevision: 1,
        quantity: 2,
        price: 65000,
        material: "Cotton",
        measurements: {
          values: {
            length: "39.25",
            fit: "Loose",
            style: "Side pocket",
            "custom-cuff": "7.5",
          },
          extraFields: [
            {
              id: "custom-cuff",
              label: "Cuff width",
              type: "number",
              required: false,
              help: "",
              options: [],
            },
          ],
          source: "new",
          confirmed: true,
          saveProfile: true,
          expectedProfileRevision: 0,
        },
      },
    ],
  };
}

test("custom settings, atomic intake, retries, profile history and immutable pieces survive relational reads and rollback", async () => {
  const { engine } = await setup();
  try {
    const submittedCatalogue = customCatalogue();
    await send({ type: "settings.save", catalogue: submittedCatalogue });
    let catalogue = (await readCatalogue()).catalogue;
    assert.equal(catalogue.defaultGarmentId, "test-kurta");
    assert.equal(catalogue.garments.at(-1)?.price, 65000);
    assert.equal(
      catalogue.garments[0].revision,
      1,
      "unchanged templates do not get a new revision",
    );
    assert.deepEqual(
      catalogue.garments.at(-1)?.presets,
      submittedCatalogue.garments.at(-1)?.presets,
    );
    await assert.rejects(
      send({ type: "settings.save", catalogue: submittedCatalogue }),
      /Settings changed/,
    );
    await send({ type: "settings.save", catalogue });
    catalogue = (await readCatalogue()).catalogue;
    assert.equal(
      catalogue.garments[0].revision,
      1,
      "JSONB object key order does not change template versions",
    );
    assert.equal(
      catalogue.garments.at(-1)?.revision,
      1,
      "unchanged presets retain their template version",
    );
    const action = intake(),
      mutationId = crypto.randomUUID();
    const created = await send(action, mutationId);
    const order = created.data.orders[0],
      customer = created.data.customers[0];
    assert.equal(order.items.length, 2);
    assert.notEqual(order.items[0].id, order.items[1].id);
    assert.equal(order.payments[0].amount, 50000);
    assert.deepEqual(order.items[0].measurement, order.items[1].measurement);
    assert.equal(order.items[0].measurement?.values["custom-cuff"], "7.5");
    assert.equal(
      customer.profiles?.[0].snapshot.values["custom-cuff"],
      undefined,
      "piece-only sizes are not silently reused",
    );
    assert.deepEqual((await readWorkspace()).data, created.data);
    assert.equal((await send(action, mutationId)).resultId, created.resultId);
    assert.equal(
      (await engine.query("SELECT * FROM sg_payments")).rows.length,
      1,
    );
    assert.equal(
      (
        await engine.query(
          "SELECT * FROM sg_domain_events WHERE type = 'order.created'",
        )
      ).rows.length,
      1,
    );
    await assert.rejects(
      send({ ...action, notes: "different" }, mutationId),
      /different change/,
    );
    await assert.rejects(
      send({
        ...action,
        customer: {
          ...(action.customer as Extract<Intake["customer"], { kind: "new" }>),
          phone: "+91 98765 43210",
        },
      }),
      /already belongs/,
    );
    assert.equal(
      (await readCustomers({ q: "+91 98765 43210", page: 1, pageSize: 5 })).data
        .customers[0].id,
      customer.id,
    );
    const saved = customer.profiles![0];
    await send({
      type: "measurement.save",
      customerId: customer.id,
      garmentId: saved.garmentId,
      garmentRevision: 1,
      measurements: {
        ...action.items[0].measurements,
        extraFields: [],
        values: { length: "40", fit: "Regular" },
        expectedProfileRevision: 1,
      },
    });
    const profileRead = (
      await readCustomer(customer.id, { page: 1, pageSize: 20 })
    ).data.customers[0];
    assert.equal(profileRead.profiles![0].revision, 2);
    assert.equal(profileRead.profiles![0].snapshot.revision, 2);
    assert.deepEqual(profileRead.profiles![0].history[0], saved.snapshot);
    assert.deepEqual((await readWorkspace()).data.orders[0], order);
    await send({
      type: "customer.save",
      customer: { ...customer, name: "Corrected customer name" },
    });
    assert.equal(
      (await readWorkspace()).data.customers[0].profiles![0].revision,
      2,
      "customer edits cannot overwrite profiles from a stale form",
    );
    const stale = {
      ...action,
      customer: { kind: "existing" as const, id: customer.id },
      items: [
        {
          ...action.items[0],
          measurements: {
            ...action.items[0].measurements,
            source: "profile" as const,
            saveProfile: false,
            expectedProfileRevision: 1,
          },
        },
      ],
    };
    await assert.rejects(send(stale), /Saved measurements changed/);
    const changed = structuredClone(catalogue);
    const garment = changed.garments.at(-1)!;
    garment.name = "Kurta deluxe";
    garment.fields[0].label = "Final length";
    garment.price = 80000;
    await send({ type: "settings.save", catalogue: changed });
    await assert.rejects(
      send({
        ...stale,
        items: [
          {
            ...stale.items[0],
            measurements: {
              ...stale.items[0].measurements,
              expectedProfileRevision: 2,
            },
          },
        ],
      }),
      /settings changed/,
    );
    const renamed = (await readCatalogue()).catalogue;
    assert.equal(renamed.garments.at(-1)?.revision, 2);
    assert.equal(
      compatibleValues(renamed.garments.at(-1)!, profileRead).length,
      "40",
    );
    renamed.garments.at(-1)!.active = false;
    renamed.defaultGarmentId = "garment-blouse";
    await send({ type: "settings.save", catalogue: renamed });
    const beforeRollback = (await readWorkspace()).data;
    assert.deepEqual(
      beforeRollback.orders[0],
      order,
      "renaming and archiving never changes old piece names, prices or field labels",
    );
    await transition("rollback");
    assert.deepEqual((await readWorkspace()).data, beforeRollback);
    await transition("cutover");
    assert.deepEqual((await readWorkspace()).data, beforeRollback);
  } finally {
    await engine.close();
  }
});

test("pending measurements block production and require old template values even after settings change", async () => {
  const { engine } = await setup();
  try {
    await send({ type: "settings.save", catalogue: customCatalogue() });
    const action = intake();
    action.items[0].measurements = {
      ...action.items[0].measurements,
      values: {},
      extraFields: [],
      confirmed: false,
      saveProfile: false,
    };
    const created = await send(action),
      order = created.data.orders[0],
      piece = order.items[0];
    assert.equal(created.data.customers[0].profiles, undefined);
    assert.equal(
      (await readWorkflow({ station: "0", page: 1, pageSize: 20 })).columns[0]
        .pieces[0].measurementsPending,
      true,
    );
    const advance = {
      type: "piece.advance" as const,
      orderId: order.id,
      pieceId: piece.id,
      expectedStation: 0,
    };
    await assert.rejects(send(advance), /Confirm this piece/);
    const edit = {
      type: "piece.measurements" as const,
      orderId: order.id,
      pieceId: piece.id,
      expectedRevision: 1,
      values: { length: "41.5", fit: "Regular" },
    };
    await assert.rejects(
      send({ ...edit, values: { fit: "Regular" } }),
      /Enter Finished length/,
    );
    await assert.rejects(
      send({ ...edit, values: { length: "-1", fit: "Regular" } }),
      /positive measurement/,
    );
    await assert.rejects(
      send({ ...edit, values: { length: "41", fit: "Unknown" } }),
      /valid option/,
    );
    await send(edit);
    await assert.rejects(send(edit), /measurements changed/);
    await send(advance);
    await assert.rejects(
      send({ ...edit, expectedRevision: 2 }),
      /before this piece leaves cutting/,
    );
    const updated = (await readWorkspace()).data.orders[0];
    assert.equal(updated.items[0].station, 1);
    assert.equal(updated.items[1].station, 0);
    assert.deepEqual(updated.items[0].measurementHistory, [piece.measurement]);
    assert.equal(updated.items[1].measurement?.confirmed, false);
    assert.deepEqual(
      validateWorkspace((await readWorkspace()).data).orders[0],
      updated,
    );
  } finally {
    await engine.close();
  }
});

test("failed persistence rolls back customer, profile, pieces, payment, settings, mutation and event together", async () => {
  const { engine } = await setup();
  try {
    await engine.exec(
      "CREATE FUNCTION fail_event() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Injected write failure'; END; $$; CREATE TRIGGER fail_event BEFORE INSERT ON sg_domain_events FOR EACH ROW EXECUTE FUNCTION fail_event();",
    );
    const action = intake();
    action.items[0] = {
      ...action.items[0],
      garmentId: "garment-blouse",
      measurements: {
        ...action.items[0].measurements,
        extraFields: [],
        values: { "field-bust": "36" },
      },
    };
    const before = await readWorkspace(),
      mutationId = crypto.randomUUID();
    await assert.rejects(send(action, mutationId));
    assert.deepEqual(await readWorkspace(), before);
    for (const table of [
      "sg_customers",
      "sg_orders",
      "sg_order_items",
      "sg_payments",
      "sg_measurement_profiles",
      "sg_shop_settings",
      "sg_garments",
      "sg_mutations",
      "sg_domain_events",
    ]) {
      assert.equal(
        (await engine.query(`SELECT * FROM ${table}`)).rows.length,
        0,
        `${table} rolled back`,
      );
    }
    await engine.exec(
      "DROP TRIGGER fail_event ON sg_domain_events; DROP FUNCTION fail_event();",
    );
    const result = await send(action, mutationId);
    assert.equal(result.data.orders.length, 1);
    assert.equal(result.data.customers.length, 1);
  } finally {
    await engine.close();
  }
});

test("new catalogue/profile data migrates losslessly from JSON and new APIs authenticate first", async () => {
  const { engine } = await setup(false);
  try {
    process.env.APP_ORIGIN = "http://localhost:3000";
    for (const [path, handler] of [
      ["/api/settings", settingsPost],
      ["/api/measurements", measurementsPost],
    ] as const) {
      const response = await handler(
        new NextRequest(`http://localhost:3000${path}`, {
          method: "POST",
          headers: {
            Origin: "http://localhost:3000",
            "Content-Type": "application/json",
          },
          body: "{}",
        }),
      );
      assert.equal(response.status, 401);
    }
    assert.equal(
      (await settingsGet(new NextRequest("http://localhost:3000/api/settings")))
        .status,
      401,
    );
    await send({ type: "settings.save", catalogue: customCatalogue() });
    await send(intake());
    const data = (await readWorkspace()).data;
    data.customers.push({
      id: "empty-profile",
      name: "Another Customer",
      phone: "9000000001",
      email: "",
      notes: "",
      measurements: {},
      profiles: [],
    });
    await engine.query(
      "UPDATE sg_workspace SET data = $1::jsonb WHERE id = 1",
      [JSON.stringify(data)],
    );
    await transition("cutover");
    assert.deepEqual((await readWorkspace()).data, data);
    await transition("rollback");
    assert.deepEqual((await readWorkspace()).data, data);
    const wrongReference: Workspace = structuredClone(data);
    wrongReference.customers[0].profiles![0].garmentId = "missing-garment";
    assert.throws(() => validateWorkspace(wrongReference), /profile/);
  } finally {
    await engine.close();
  }
});
