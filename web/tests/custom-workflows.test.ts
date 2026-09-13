import { test } from "node:test";
import assert from "node:assert/strict";
import { isolatedDatabase } from "./helpers/isolated-database";
import { ensureSchema } from "../src/db";
import {
  readWorkspace,
  executeWorkspaceCommand,
} from "../src/services/workspace-service";
import { readCatalogue } from "../src/services/catalogue-storage";
import { readWorkflow } from "../src/services/workflow-read-service";
import { readOrder } from "../src/services/order-read-service";
import { readWork } from "../src/services/team-read-service";
import { workQuery } from "../src/features/team/contracts/team";
import {
  storageStatus,
  transitionWorkspaceStorage,
} from "../src/services/storage-migration-service";
import { validateWorkspace } from "../src/db/workspace-validation";
import { defaultCatalogue } from "../src/features/settings/domain/catalogue";
import { catalogueSchema } from "../src/features/settings/contracts/catalogue";
import {
  defaultWorkflowSettings,
  snapshotWorkflow,
  validateWorkflowSettings,
} from "../src/features/workflow/domain/templates";
import { pieceWorkflowSchema } from "../src/features/workflow/contracts/settings";
import { shopDate } from "../src/shared/workspace";
import type { WorkspaceMutation } from "../src/shared/contracts/command";
import type { Intake } from "../src/features/orders/contracts/intake";

const owner = { name: "Test Owner", email: "workflow@example.test" };
const send = (action: WorkspaceMutation, mutationId = crypto.randomUUID()) =>
  executeWorkspaceCommand({ action, mutationId }, owner);
async function transition(direction: "cutover" | "rollback") {
  const status = await storageStatus();
  return transitionWorkspaceStorage({
    direction,
    expectedRevision: status.revision,
    expectedChecksum: status.checksum,
    backupReference: "isolated-workflow-test",
  });
}
function catalogue() {
  const value = defaultCatalogue();
  value.workflows = defaultWorkflowSettings();
  value.workflows.templates.push({
    id: "bridal",
    name: "Bridal finish",
    active: true,
    revision: 1,
    steps: [
      "Repair",
      "Lining",
      "Embroidery",
      "Assembly",
      "Fitting",
      "Adjustments",
      "Pressing",
      "Quality check",
    ].map((name, i) => ({ id: `bridal-${i}`, name, station: i < 6 ? 3 : 4 })),
  });
  value.garments.push({
    id: "test-garment",
    name: "Test garment",
    active: true,
    revision: 1,
    workflowId: "bridal",
    price: 10000,
    unit: "in",
    fields: [],
    presets: [],
  });
  return value;
}
function intake(
  garmentId = "test-garment",
  garmentRevision = 1,
  confirmed = true,
): Intake {
  return {
    type: "order.intake",
    customer: {
      kind: "new",
      name: "Test customer",
      phone: "9876543210",
      email: "",
      notes: "",
    },
    dueDate: shopDate(),
    priority: "normal",
    notes: "",
    advance: 0,
    method: "Cash",
    items: [
      {
        garmentId,
        garmentRevision,
        quantity: 1,
        price: 10000,
        material: "Cotton",
        measurements: {
          values: garmentId === "garment-blouse" ? { "field-bust": "36" } : {},
          extraFields: [],
          source: "new",
          confirmed,
          saveProfile: false,
          expectedProfileRevision: 0,
        },
      },
    ],
  };
}

test("workflow contracts reject invalid templates, references and progress; archive and revision rules protect saved settings", () => {
  const base = catalogue();
  assert.ok(catalogueSchema.safeParse(base).success);
  for (const change of [
    (v: typeof base) => {
      v.workflows!.templates[1].steps = [];
    },
    (v: typeof base) => {
      v.workflows!.templates[1].steps = Array.from({ length: 21 }, (_, i) => ({
        id: `s${i}`,
        name: `Step ${i}`,
        station: 0,
      }));
    },
    (v: typeof base) => {
      v.workflows!.templates[1].steps[1].id = "bridal-0";
    },
    (v: typeof base) => {
      v.workflows!.templates[1].steps[1].name = "REPAIR";
    },
    (v: typeof base) => {
      v.workflows!.templates[1].id = "standard-tailoring";
    },
    (v: typeof base) => {
      v.workflows!.templates[1].name = "Standard tailoring";
    },
    (v: typeof base) => {
      v.workflows!.templates[0].active = false;
    },
    (v: typeof base) => {
      v.garments.at(-1)!.workflowId = "missing";
    },
    (v: typeof base) => {
      delete v.workflows;
    },
  ]) {
    const invalid = structuredClone(base);
    change(invalid);
    assert.equal(catalogueSchema.safeParse(invalid).success, false);
  }
  const missing = structuredClone(base);
  missing.workflows!.templates.pop();
  assert.throws(
    () => validateWorkflowSettings(missing, base),
    /Archive existing workflows/,
  );
  assert.throws(
    () => validateWorkflowSettings(defaultCatalogue(), base),
    /Reload settings/,
  );
  const changed = structuredClone(base);
  changed.workflows!.templates[1].steps[0].name = "Mending";
  validateWorkflowSettings(changed, base);
  assert.equal(changed.workflows!.templates[1].revision, 2);
  assert.equal(changed.workflows!.templates[0].revision, 1);
  const snapshot = snapshotWorkflow(base, base.garments.at(-1))!;
  assert.equal(
    pieceWorkflowSchema.safeParse({ ...snapshot, position: 9 }).success,
    false,
  );
  assert.equal(
    snapshotWorkflow(defaultCatalogue()),
    undefined,
    "legacy items keep their original flow",
  );
});

test("custom workflows persist, advance same-station steps safely, retain immutable snapshots and survive rollback", async () => {
  const { engine } = isolatedDatabase();
  try {
    await ensureSchema();
    await engine.query(
      "INSERT INTO sg_owner(id, name, email, password_hash, salt) VALUES (1, $1, $2, 'test-hash', 'test-salt')",
      [owner.name, owner.email],
    );
    // Create a legacy item in JSON mode before workflow configuration exists.
    const legacy = await send(intake("garment-blouse"));
    const legacyOrder = legacy.data.orders[0];
    assert.equal(legacyOrder.items[0].workflow, undefined);
    await transition("cutover");
    await send({ type: "settings.save", catalogue: catalogue() });
    const action = intake("test-garment", 1, false);
    action.customer = { kind: "existing", id: legacyOrder.customerId };
    const created = await send(action);
    const orderId = created.resultId!,
      item = created.data.orders[0].items[0],
      pieceId = item.id;
    assert.equal(item.station, 3, "a workflow may start at any workstation");
    assert.equal(item.workflow?.steps.length, 8);
    const advance = {
      type: "piece.advance" as const,
      orderId,
      pieceId,
      expectedStation: 3,
      expectedWorkflowVersion: 0,
    };
    await assert.rejects(send(advance), /Confirm this piece/);
    await send({
      type: "piece.measurements",
      orderId,
      pieceId,
      expectedRevision: 1,
      values: {},
    });
    const mutationId = crypto.randomUUID();
    await send(advance, mutationId);
    await send(advance, mutationId);
    let piece = (await readWorkspace()).data.orders.find(
      (o) => o.id === orderId,
    )!.items[0];
    assert.equal(piece.station, 3);
    assert.equal(
      piece.workflow?.position,
      1,
      "retry does not skip the next same-station step",
    );
    assert.equal(piece.workflow?.version, 1);
    await assert.rejects(send(advance), /workflow progress changed/);
    await assert.rejects(
      send({ ...advance, expectedWorkflowVersion: undefined }),
      /workflow progress changed/,
    );
    await assert.rejects(
      send({
        type: "piece.measurements",
        orderId,
        pieceId,
        expectedRevision: 2,
        values: {},
      }),
      /first step/,
    );
    const queue = await readWorkflow({ station: "3", page: 1, pageSize: 20 });
    assert.deepEqual(queue.columns[3].pieces[0].item.workflow, piece.workflow);
    assert.deepEqual(
      (await readOrder(orderId, { page: 1, pageSize: 20 })).data.orders[0]
        .items[0].workflow,
      piece.workflow,
    );
    const history = await engine.query(
      "SELECT from_step, to_step FROM sg_workflow_history WHERE piece_id=$1 AND kind='advance'",
      [pieceId],
    );
    assert.deepEqual(history.rows, [
      {
        from_step: { id: "bridal-0", name: "Repair", position: 0 },
        to_step: { id: "bridal-1", name: "Lining", position: 1 },
      },
    ]);
    const rework = {
      type: "piece.rework" as const,
      orderId,
      pieceId,
      station: 3,
      stepId: "bridal-0",
      expectedWorkflowVersion: 1,
      reason: "Fix the seam",
    };
    await assert.rejects(
      send({ ...rework, stepId: "bridal-5" }),
      /earlier workflow step/,
    );
    await send(rework);
    await assert.rejects(send(rework), /workflow progress changed/);
    const beforeEdit = (await readWorkspace()).data.orders.find(
      (o) => o.id === orderId,
    )!.items[0].workflow;
    let saved = (await readCatalogue()).catalogue;
    saved.workflows!.templates[1].steps[0].name = "New first step";
    await send({ type: "settings.save", catalogue: saved });
    saved = (await readCatalogue()).catalogue;
    assert.equal(
      saved.garments.at(-1)!.revision,
      2,
      "workflow edits invalidate a stale intake preview",
    );
    await assert.rejects(send(action), /settings changed/);
    assert.deepEqual(
      (await readWorkspace()).data.orders.find((o) => o.id === orderId)!
        .items[0].workflow,
      beforeEdit,
    );
    const newOrder = await send({
      ...action,
      items: [
        {
          ...action.items[0],
          garmentRevision: 2,
          measurements: { ...action.items[0].measurements, confirmed: true },
        },
      ],
    });
    assert.equal(
      newOrder.data.orders[0].items[0].workflow?.steps[0].name,
      "New first step",
    );
    // Changing the shop default also invalidates garments that inherit it.
    saved.workflows!.defaultWorkflowId = "bridal";
    await send({ type: "settings.save", catalogue: saved });
    saved = (await readCatalogue()).catalogue;
    assert.equal(saved.garments[0].revision, 2);
    const inherited = await send({
      ...action,
      items: [{ ...intake("garment-blouse", 2).items[0] }],
    });
    assert.equal(inherited.data.orders[0].items[0].workflow?.id, "bridal");
    for (let position = 0; position < 8; position++) {
      piece = (await readWorkspace()).data.orders.find((o) => o.id === orderId)!
        .items[0];
      assert.equal(piece.workflow!.position, position);
      await send({
        ...advance,
        expectedStation: piece.station,
        expectedWorkflowVersion: piece.workflow!.version,
      });
    }
    const finished = (await readWorkspace()).data.orders.find(
      (o) => o.id === orderId,
    )!;
    assert.equal(finished.status, "ready");
    assert.equal(finished.items[0].station, 5);
    assert.equal(finished.items[0].workflow!.position, 8);
    await send({
      ...rework,
      stepId: "bridal-6",
      station: 4,
      expectedWorkflowVersion: finished.items[0].workflow!.version,
    });
    await send({
      type: "piece.advance",
      orderId: legacyOrder.id,
      pieceId: legacyOrder.items[0].id,
      expectedStation: 0,
    });
    const worker = await send({
      type: "team.save",
      name: "Workflow worker",
      expectedRevision: 0,
      password: "workflow-test-only-password",
      worker: {
        email: "stitcher@example.test",
        skills: [3],
        active: true,
        available: true,
        capacityMinutes: 480,
        revision: 1,
      },
    });
    const workOrder = newOrder.data.orders[0];
    const target = {
      orderId: workOrder.id,
      pieceId: workOrder.items[0].id,
      expectedStation: 3,
    };
    await send({
      type: "work.assign",
      ...target,
      expectedVersion: 0,
      assigneeId: worker.resultId!,
    });
    await send({
      type: "work.update",
      ...target,
      expectedVersion: 1,
      operation: "start",
    });
    const workerSession = {
      name: "Workflow worker",
      email: "stitcher@example.test",
      role: "worker" as const,
      staffId: worker.resultId!,
    };
    const workerRead = await readWork(workQuery.parse({}), workerSession);
    assert.equal(
      workerRead.pieces[0].item.workflow!.steps[0].name,
      "New first step",
    );
    assert.equal(Object.hasOwn(workerRead.pieces[0].item, "price"), false);
    const complete = {
      type: "work.update" as const,
      ...target,
      expectedVersion: 2,
      operation: "complete" as const,
    };
    await send(complete);
    await assert.rejects(send(complete), /work changed/);
    const handoff = (await readWorkspace()).data.orders.find(
      (o) => o.id === workOrder.id,
    )!.items[0];
    assert.equal(handoff.station, 3);
    assert.equal(handoff.workflow!.position, 1);
    assert.equal(handoff.work!.status, "pending");
    assert.equal(handoff.work!.assigneeId, undefined);
    const workerHistory = await engine.query<{ to_step: { name: string } }>(
      "SELECT from_step, to_step FROM sg_workflow_history WHERE piece_id=$1 AND kind='advance'",
      [handoff.id],
    );
    assert.equal(
      (workerHistory.rows[0].to_step as { name: string }).name,
      "Lining",
    );
    const beforeRollback = (await readWorkspace()).data;
    const bad = structuredClone(beforeRollback);
    bad.orders.find((o) => o.id === orderId)!.items[0].station = 0;
    assert.throws(() => validateWorkspace(bad), /workflow/);
    await transition("rollback");
    assert.deepEqual((await readWorkspace()).data, beforeRollback);
    await transition("cutover");
    assert.deepEqual((await readWorkspace()).data, beforeRollback);
    assert.equal(
      (await readCatalogue()).catalogue.workflows!.templates[1].revision,
      2,
    );
  } finally {
    await engine.close();
  }
});
