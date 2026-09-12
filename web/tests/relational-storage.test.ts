import { test } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { isolatedDatabase } from "./helpers/isolated-database";
import { ensureSchema } from "../src/db";
import { baseline } from "../src/db/migrations/0001-baseline";
import {
  createPreviewWorkspace,
  emptyWorkspace,
  shopDate,
  total,
  paid,
  type Workspace,
} from "../src/shared/workspace";
import {
  validateWorkspace,
  workspaceManifest,
} from "../src/db/workspace-validation";
import {
  storageStatus,
  transitionWorkspaceStorage,
} from "../src/services/storage-migration-service";
import {
  readWorkspace,
  executeWorkspaceCommand,
} from "../src/services/workspace-service";
import { hashToken } from "../src/shared/server/crypto";
import { GET } from "../src/app/api/workspace/route";
import type { WorkspaceMutation } from "../src/shared/contracts/command";

const owner = { name: "Preserved Owner", email: "owner@example.test" };
const token = "a".repeat(64);

function fixture(): Workspace {
  const data = createPreviewWorkspace();
  data.customers[0].measurementHistory = [
    { date: "2026-01-01T10:00:00+05:30", values: { Bust: "34", Waist: "30" } },
  ];
  data.customers[1].measurementHistory = [];
  data.orders[0].items.push({
    id: "second-legacy-piece",
    garment: "Blouse",
    material: "Cotton",
    station: 3,
    price: 30001,
  });
  data.closedDays = ["2026-01-01"];
  data.dayReports = [
    {
      date: "2026-01-01",
      reviewedBy: "Earlier Owner",
      reviewedAt: "2026-01-01T20:00:00+05:30",
      delivered: 3,
      ready: 2,
      unfinished: 4,
      collected: 5000000001,
      pending: 7000000002,
    },
  ];
  return data;
}

async function seed(data: Workspace) {
  const context = isolatedDatabase();
  await ensureSchema();
  await context.engine.query(
    "INSERT INTO sg_owner(id, name, email, password_hash, salt) VALUES(1, $1, $2, 'existing-scrypt-hash', 'existing-salt')",
    [owner.name, owner.email],
  );
  await context.engine.query(
    "INSERT INTO sg_sessions(token_hash, owner_id, expires_at) VALUES($1, 1, now() + interval '1 day')",
    [hashToken(token)],
  );
  await context.engine.query(
    "UPDATE sg_workspace SET revision = 37, data = $1::jsonb WHERE id = 1",
    [JSON.stringify(data)],
  );
  return context;
}

async function authenticatedRead() {
  return GET(
    new NextRequest("http://localhost:3000/api/workspace", {
      headers: { Cookie: `swapna_session=${token}` },
    }),
  );
}

test("operator status is read-only on the original production schema", async () => {
  const { engine } = isolatedDatabase();
  try {
    await engine.exec(baseline);
    await engine.query(
      "INSERT INTO sg_workspace(id, revision, data) VALUES (1, 13, $1::jsonb)",
      [JSON.stringify(emptyWorkspace())],
    );
    const status = await storageStatus();
    assert.equal(status.storageModel, "json");
    assert.equal(status.revision, 13);
    const ledger = await engine.query<{ name: string | null }>(
      "SELECT to_regclass('public.sg_schema_migrations') AS name",
    );
    assert.equal(ledger.rows[0].name, null);
    const columns = await engine.query(
      "SELECT * FROM information_schema.columns WHERE table_name = 'sg_workspace' AND column_name = 'storage_model'",
    );
    assert.equal(columns.rows.length, 0);
  } finally {
    await engine.close();
  }
});

test("cutover rehearsal, relational commands and rollback preserve all shop and authentication records", async () => {
  const original = fixture();
  const { engine } = await seed(original);
  try {
    const accounts = (await engine.query("SELECT * FROM sg_owner")).rows;
    const sessions = (await engine.query("SELECT * FROM sg_sessions")).rows;
    const legacyMutation = crypto.randomUUID();
    await engine.query(
      "INSERT INTO sg_mutations(id, result_id) VALUES($1, $2)",
      [legacyMutation, original.orders[0].id],
    );
    const planned = await transitionWorkspaceStorage({
      direction: "cutover",
      dryRun: true,
    });
    assert.equal(planned.committed, false);
    assert.equal(planned.revision, 37);
    assert.equal(planned.projectedRevision, 38);
    assert.deepEqual(planned.counts, workspaceManifest(original).counts);
    assert.deepEqual(planned.totals, workspaceManifest(original).totals);
    assert.equal((await storageStatus()).storageModel, "json");
    assert.deepEqual((await readWorkspace()).data, original);
    for (const table of [
      "sg_workspace_backups",
      "sg_customers",
      "sg_orders",
      "sg_workflow_history",
    ]) {
      assert.equal(
        (await engine.query(`SELECT * FROM ${table}`)).rows.length,
        0,
      );
    }
    const approved = {
      direction: "cutover" as const,
      expectedRevision: planned.revision,
      expectedChecksum: planned.checksum,
      backupReference: "isolated-full-backup-fixture",
    };
    await assert.rejects(
      transitionWorkspaceStorage({ ...approved, backupReference: undefined }),
      /backup reference/,
    );
    await assert.rejects(
      transitionWorkspaceStorage({ ...approved, expectedRevision: 36 }),
      /revision changed/,
    );
    await assert.rejects(
      transitionWorkspaceStorage({
        ...approved,
        expectedChecksum: "0".repeat(64),
      }),
      /checksum changed/,
    );
    const migrated = await transitionWorkspaceStorage(approved);
    assert.equal(migrated.committed, true);
    assert.equal(migrated.storageModel, "relational");
    assert.equal(migrated.revision, 38);
    assert.deepEqual((await readWorkspace()).data, validateWorkspace(original));
    const storedBackup = await engine.query<{
      data: unknown;
      checksum: string;
    }>("SELECT data, checksum FROM sg_workspace_backups WHERE id = $1", [
      migrated.backupId,
    ]);
    assert.deepEqual(storedBackup.rows[0].data, original);
    assert.equal(storedBackup.rows[0].checksum, planned.checksum);
    const retryCutover = await transitionWorkspaceStorage(approved);
    assert.equal(retryCutover.changed, false);
    assert.equal(
      (await engine.query("SELECT * FROM sg_workspace_backups")).rows.length,
      1,
    );
    assert.deepEqual(
      (await engine.query("SELECT * FROM sg_owner")).rows,
      accounts,
    );
    assert.deepEqual(
      (await engine.query("SELECT * FROM sg_sessions")).rows,
      sessions,
    );
    const response = await authenticatedRead();
    assert.equal(response.status, 200);
    assert.deepEqual((await response.json()).owner, owner);
    await assert.rejects(
      engine.query(
        "UPDATE sg_workspace SET data = jsonb_set(data, '{orders,0,notes}', '\"legacy overwrite\"') WHERE id = 1",
      ),
      /Legacy snapshot writes/,
    );
    await assert.rejects(
      engine.query("UPDATE sg_workspace_backups SET checksum = 'changed'"),
      /immutable/,
    );
    await assert.rejects(
      engine.query(
        "INSERT INTO sg_payments(id, order_id, position, amount, method, paid_at) VALUES('bad-payment', $1, 0, -1, 'Cash', now())",
        [original.orders[0].id],
      ),
      /check constraint/,
    );
    await assert.rejects(
      engine.query(
        "INSERT INTO sg_payments(id, order_id, position, amount, method, paid_at) VALUES('orphan-payment', 'unknown-order', 0, 10, 'Cash', now())",
      ),
      /foreign key constraint/,
    );

    const mutate = (
      action: WorkspaceMutation,
      mutationId = crypto.randomUUID(),
    ) => executeWorkspaceCommand({ mutationId, action }, owner);
    const customer = original.customers[0];
    await mutate({
      type: "customer.save",
      customer: {
        ...customer,
        measurements: { ...customer.measurements, Bust: "39" },
      },
    });
    assert.equal(
      (
        await engine.query(
          "SELECT * FROM sg_measurement_versions WHERE customer_id = $1",
          [customer.id],
        )
      ).rows.length,
      2,
    );
    const paymentId = crypto.randomUUID();
    const paymentAction = {
      type: "payment.record" as const,
      orderId: original.orders[0].id,
      amount: 1001,
      method: "UPI" as const,
    };
    const payment = await mutate(paymentAction, paymentId);
    const paymentRetry = await mutate(paymentAction, paymentId);
    assert.equal(paymentRetry.revision, payment.revision);
    assert.equal(
      (
        await engine.query("SELECT * FROM sg_payments WHERE order_id = $1", [
          paymentAction.orderId,
        ])
      ).rows.length,
      original.orders[0].payments.length + 1,
    );
    const pieceAction = {
      type: "piece.advance" as const,
      orderId: original.orders[0].id,
      pieceId: original.orders[0].items[0].id,
      expectedStation: 3,
    };
    await mutate(pieceAction);
    await assert.rejects(mutate(pieceAction), /progress has changed/);
    const reworkId = crypto.randomUUID();
    const reworkAction = {
      type: "piece.rework" as const,
      orderId: pieceAction.orderId,
      pieceId: pieceAction.pieceId,
      station: 0,
      reason: "Adjust the sleeve.",
    };
    await mutate(reworkAction, reworkId);
    await mutate(reworkAction, reworkId);
    const history = await engine.query<{
      kind: string;
      from_station: number;
      to_station: number;
      reason: string;
    }>(
      "SELECT * FROM sg_workflow_history WHERE piece_id = $1 ORDER BY occurred_at",
      [pieceAction.pieceId],
    );
    assert.deepEqual(
      history.rows.map((row) => row.kind),
      ["baseline", "advance", "rework"],
    );
    assert.equal(history.rows[2].from_station, 4);
    assert.equal(history.rows[2].to_station, 0);
    assert.equal(history.rows[2].reason, reworkAction.reason);
    const created = await mutate({
      type: "order.create",
      customerId: customer.id,
      items: [
        { garment: "Gown", price: 125001, material: "Silk" },
        { garment: "Blouse", price: 50000, material: "Cotton" },
      ],
      priority: "high",
      dueDate: shopDate(),
      notes: "New relational order",
      advance: 25001,
      method: "Cash",
    });
    assert.equal(created.data.orders[0].number, "SG-1053");
    assert.equal(
      (
        await engine.query(
          "SELECT * FROM sg_workflow_history WHERE order_id = $1 AND kind = 'created'",
          [created.resultId],
        )
      ).rows.length,
      2,
    );
    const readyOrder = original.orders.find((o) => o.status === "ready")!;
    await mutate({
      type: "payment.record",
      orderId: readyOrder.id,
      amount: total(readyOrder) - paid(readyOrder),
      method: "UPI",
    });
    await mutate({ type: "order.deliver", orderId: readyOrder.id });
    const delivered = await engine.query<{
      status: string;
      delivered_at: unknown;
    }>("SELECT status, delivered_at FROM sg_orders WHERE id = $1", [
      readyOrder.id,
    ]);
    assert.equal(delivered.rows[0].status, "delivered");
    assert.ok(delivered.rows[0].delivered_at);

    // Force the final history insert to fail: state, revision and retry identity must all roll back.
    await engine.exec(`CREATE FUNCTION fail_test_history() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'isolated test failure'; END; $$;
      CREATE TRIGGER fail_test_history BEFORE INSERT ON sg_workflow_history FOR EACH ROW EXECUTE FUNCTION fail_test_history();`);
    const beforeFailure = await readWorkspace();
    const failedId = crypto.randomUUID();
    await assert.rejects(
      mutate({ ...pieceAction, expectedStation: 0 }, failedId),
    );
    assert.deepEqual(await readWorkspace(), beforeFailure);
    assert.equal(
      (
        await engine.query("SELECT * FROM sg_mutations WHERE id = $1", [
          failedId,
        ])
      ).rows.length,
      0,
    );
    await engine.exec(
      "DROP TRIGGER fail_test_history ON sg_workflow_history; DROP FUNCTION fail_test_history();",
    );
    await mutate({ ...pieceAction, expectedStation: 0 }, failedId);
    const closing = await mutate({ type: "day.close", date: shopDate() });
    const closingRow = await engine.query<{ collected: string }>(
      "SELECT collected FROM sg_day_reports WHERE date = $1",
      [shopDate()],
    );
    assert.equal(
      Number(closingRow.rows[0].collected),
      closing.data.dayReports!.find((r) => r.date === shopDate())!.collected,
    );
    await assert.rejects(
      mutate({ type: "day.close", date: shopDate() }),
      /already been reviewed/,
    );

    const current = await readWorkspace();
    const rollbackPlan = await transitionWorkspaceStorage({
      direction: "rollback",
      dryRun: true,
    });
    assert.equal(rollbackPlan.committed, false);
    assert.deepEqual(await readWorkspace(), current);
    const rolledBack = await transitionWorkspaceStorage({
      direction: "rollback",
      expectedRevision: rollbackPlan.revision,
      expectedChecksum: rollbackPlan.checksum,
      backupReference: "isolated-pre-rollback-full-backup",
    });
    assert.equal(rolledBack.storageModel, "json");
    assert.deepEqual((await readWorkspace()).data, current.data);
    assert.deepEqual(
      (await engine.query<{ data: unknown }>("SELECT data FROM sg_workspace"))
        .rows[0].data,
      current.data,
    );
    assert.equal(
      (await engine.query("SELECT * FROM sg_workspace_backups")).rows.length,
      2,
    );
    assert.equal(
      (await mutate(paymentAction, paymentId)).data.orders.find(
        (o) => o.id === paymentAction.orderId,
      )!.payments.length,
      original.orders[0].payments.length + 1,
    );
    await mutate({
      type: "customer.save",
      customer: {
        id: "customer-after-rollback",
        name: "Local Test",
        phone: "9000000199",
        email: "",
        notes: "",
        measurements: {},
      },
    });
    const recutoverPlan = await transitionWorkspaceStorage({
      direction: "cutover",
      dryRun: true,
    });
    const beforeRecutover = await readWorkspace();
    await transitionWorkspaceStorage({
      direction: "cutover",
      expectedRevision: recutoverPlan.revision,
      expectedChecksum: recutoverPlan.checksum,
      backupReference: "isolated-recutover-full-backup",
    });
    assert.deepEqual(
      (await readWorkspace()).data,
      validateWorkspace(beforeRecutover.data),
    );
    assert.equal(
      (
        await engine.query(
          "SELECT * FROM sg_workflow_history WHERE mutation_id = $1",
          [reworkId],
        )
      ).rows.length,
      1,
    );
    assert.deepEqual(
      (await engine.query("SELECT * FROM sg_owner")).rows,
      accounts,
    );
    assert.deepEqual(
      (await engine.query("SELECT * FROM sg_sessions")).rows,
      sessions,
    );
    assert.equal(
      (
        await engine.query("SELECT * FROM sg_mutations WHERE id = $1", [
          legacyMutation,
        ])
      ).rows.length,
      1,
    );
  } finally {
    await engine.close();
  }
});

test("an existing empty shop can switch storage without inventing optional reports or sample records", async () => {
  const data = emptyWorkspace();
  delete data.dayReports;
  const { engine } = await seed(data);
  try {
    const plan = await transitionWorkspaceStorage({
      direction: "cutover",
      dryRun: true,
    });
    await transitionWorkspaceStorage({
      direction: "cutover",
      expectedRevision: plan.revision,
      expectedChecksum: plan.checksum,
      backupReference: "isolated-empty-shop-backup",
    });
    assert.deepEqual((await readWorkspace()).data, data);
    assert.equal(
      (await engine.query("SELECT * FROM sg_workflow_history")).rows.length,
      0,
    );
    assert.equal(
      (await engine.query("SELECT * FROM sg_orders")).rows.length,
      0,
    );
    assert.equal((await engine.query("SELECT * FROM sg_owner")).rows.length, 1);
  } finally {
    await engine.close();
  }
});

test("reconciliation rejects extra hidden relational records and rolls back the attempted backfill", async () => {
  const data = createPreviewWorkspace();
  const { engine } = await seed(data);
  try {
    const c = data.customers[0];
    await engine.query(
      "INSERT INTO sg_customers(id, position, name, phone, phone_key, email, notes, measurements) VALUES($1, 0, $2, $3, $3, '', '', '{}')",
      [c.id, c.name, c.phone],
    );
    await engine.query(
      'INSERT INTO sg_measurement_versions(customer_id, version, recorded_at, "values") VALUES($1, 0, now(), \'{"Bust":"42"}\')',
      [c.id],
    );
    await assert.rejects(
      transitionWorkspaceStorage({ direction: "cutover", dryRun: true }),
      /reconciliation failed/,
    );
    assert.equal((await storageStatus()).storageModel, "json");
    assert.deepEqual((await readWorkspace()).data, data);
    assert.equal(
      (await engine.query("SELECT * FROM sg_orders")).rows.length,
      0,
    );
    assert.equal(
      (await engine.query("SELECT * FROM sg_workspace_backups")).rows.length,
      0,
    );
    assert.equal(
      (await engine.query("SELECT * FROM sg_measurement_versions")).rows.length,
      1,
    );
  } finally {
    await engine.close();
  }
});

test("migration validation rejects unmapped fields, duplicate IDs, missing references and invalid money", () => {
  const data = fixture();
  assert.throws(
    () => validateWorkspace({ ...data, unmappedFutureField: true }),
    /validation failed/,
  );
  const duplicate = structuredClone(data);
  duplicate.orders[1].items[0].id = duplicate.orders[0].items[0].id;
  assert.throws(() => validateWorkspace(duplicate), /duplicate piece IDs/);
  const orphan = structuredClone(data);
  orphan.orders[0].customerId = "missing-customer";
  assert.throws(() => validateWorkspace(orphan), /without its customer/);
  const overpaid = structuredClone(data);
  overpaid.orders[0].payments[0].amount = 99_999_999;
  assert.throws(() => validateWorkspace(overpaid), /inconsistent order totals/);
  const invalidDate = structuredClone(data);
  invalidDate.orders[0].dueDate = "2026-02-30";
  assert.throws(() => validateWorkspace(invalidDate), /validation failed/);
  const preciseTimestamp = structuredClone(data);
  preciseTimestamp.orders[0].createdAt = "2026-01-01T00:00:00.000001Z";
  assert.throws(() => validateWorkspace(preciseTimestamp), /validation failed/);
  const first = workspaceManifest(data);
  const equivalent = validateWorkspace(data);
  assert.equal(workspaceManifest(equivalent).checksum, first.checksum);
  assert.equal(equivalent.customers[1].measurementHistory?.length, 0);
  assert.equal(equivalent.customers[2].measurementHistory, undefined);
});
