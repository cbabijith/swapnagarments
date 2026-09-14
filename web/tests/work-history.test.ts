import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { isolatedDatabase } from "./helpers/isolated-database";
import { authenticate, getUserSession } from "../src/services/auth-service";
import {
  executeWorkspaceCommand,
  readWorkspace,
} from "../src/services/workspace-service";
import {
  storageStatus,
  transitionWorkspaceStorage,
} from "../src/services/storage-migration-service";
import {
  readWorkHistory,
  readWorkHistoryDetail,
} from "../src/services/work-history-service";
import { readAccessibleWorkImage } from "../src/services/work-image-service";
import { storage } from "../src/integrations/storage";
import { GET as detailGet } from "../src/app/api/work/history/[id]/route";
import { GET as imageGet } from "../src/app/api/design-library/[id]/image/route";
import type { MeasurementSnapshot } from "../src/features/measurements/contracts/profiles";
import { defaultCatalogue } from "../src/features/settings/domain/catalogue";
import { workHistoryQuery } from "../src/features/team/contracts/work-history";
import { workHistory } from "../src/db/migrations/0010-work-history";
import { GET as historyGet } from "../src/app/api/work/history/route";
import { POST as workPost } from "../src/app/api/work/route";
import { shopDate } from "../src/shared/workspace";
import type { WorkspaceMutation } from "../src/shared/contracts/command";
import type { SessionUser, Worker } from "../src/features/team/contracts/team";

test("worker history preserves completed stages, scopes accounts, filters and pages, and safely recovers old completions", async () => {
  const context = isolatedDatabase();
  const owner = { name: "Same Name", email: "history-owner@example.test" };
  const password = "history-fixture-password";
  process.env.SETUP_TOKEN = "history-test-setup";
  process.env.APP_ORIGIN = "http://localhost:3000";
  const send = (
    action: WorkspaceMutation,
    user: SessionUser = owner,
    mutationId = crypto.randomUUID(),
  ) => executeWorkspaceCommand({ action, mutationId }, user);
  const req = (query = "", token?: string) =>
    new NextRequest(`http://localhost:3000/api/work/history${query}`, {
      headers: token ? { Cookie: `swapna_session=${token}` } : {},
    });
  const detail = (id: string, token?: string) =>
    detailGet(
      new NextRequest(`http://localhost:3000/api/work/history/${id}`, {
        headers: token ? { Cookie: `swapna_session=${token}` } : {},
      }),
      { params: Promise.resolve({ id }) },
    );
  async function transition(direction: "cutover" | "rollback") {
    const current = await storageStatus();
    return transitionWorkspaceStorage({
      direction,
      expectedRevision: current.revision,
      expectedChecksum: current.checksum,
      backupReference: "isolated-history-fixture",
    });
  }
  async function createWorker(email: string) {
    const worker: Worker = {
      email,
      active: true,
      available: true,
      capacityMinutes: 480,
      skills: [0, 1, 2, 3, 4],
      revision: 1,
    };
    const result = await send({
      type: "team.save",
      name: "Same Name",
      worker,
      password,
      expectedRevision: 0,
    });
    const token = await authenticate({ action: "signin", email, password });
    return {
      id: result.resultId!,
      token,
      user: (await getUserSession(token))!,
    };
  }
  async function item(orderId: string, pieceId: string) {
    return (await readWorkspace()).data.orders
      .find((o) => o.id === orderId)!
      .items.find((p) => p.id === pieceId)!;
  }
  async function assign(orderId: string, pieceId: string, workerId: string) {
    const piece = await item(orderId, pieceId);
    await send({
      type: "work.assign",
      orderId,
      pieceId,
      expectedStation: piece.station,
      expectedVersion: piece.work?.version ?? 0,
      assigneeId: workerId,
    });
  }
  async function complete(
    orderId: string,
    pieceId: string,
    worker: Awaited<ReturnType<typeof createWorker>>,
    retry = false,
  ) {
    const piece = await item(orderId, pieceId);
    await send(
      {
        type: "work.update",
        orderId,
        pieceId,
        expectedStation: piece.station,
        expectedVersion: piece.work!.version,
        operation: "start",
      },
      worker.user,
    );
    const action = {
      type: "work.update" as const,
      orderId,
      pieceId,
      expectedStation: piece.station,
      expectedVersion: piece.work!.version + 1,
      operation: "complete" as const,
    };
    const mutationId = crypto.randomUUID();
    const post = () =>
      workPost(
        new NextRequest("http://localhost:3000/api/work", {
          method: "POST",
          headers: {
            Origin: "http://localhost:3000",
            Cookie: `swapna_session=${worker.token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ mutationId, action }),
        }),
      );
    assert.equal((await post()).status, 200);
    if (retry) assert.equal((await post()).status, 200);
  }
  try {
    const ownerToken = await authenticate({
      action: "setup",
      ...owner,
      password,
      setupToken: process.env.SETUP_TOKEN,
    });
    await transition("cutover");
    await send({ type: "settings.save", catalogue: defaultCatalogue() });
    const a = await createWorker("history-a@example.test");
    const b = await createWorker("history-b@example.test");
    const customer = await send({
      type: "customer.save",
      customer: {
        id: "history-customer",
        name: "Private customer",
        email: "private@example.test",
        phone: "9000000001",
        notes: "Private customer note",
        measurements: {},
      },
    });
    const created = await send({
      type: "order.create",
      customerId: customer.resultId!,
      items: [
        { garment: "Blouse", material: "Private fabric notes", price: 10000 },
        { garment: "Gown", material: "Private fabric notes", price: 10000 },
      ],
      priority: "normal",
      dueDate: shopDate(),
      notes: "Private order notes",
      advance: 20000,
      method: "Cash",
    });
    const orderId = created.resultId!;
    const order = created.data.orders.find((o) => o.id === orderId)!;
    const [first, second] = order.items;
    const reference = {
      id: `upload-${crypto.randomUUID()}`,
      label: "Saved sleeve reference",
      kind: "reference" as const,
      view: "reference" as const,
    };
    const measurement: MeasurementSnapshot = {
      garmentId: "garment-blouse",
      garmentName: "Blouse",
      garmentRevision: 1,
      revision: 1,
      unit: "cm",
      confirmed: true,
      source: "new",
      recordedAt: new Date().toISOString(),
      recordedBy: "Private measurer",
      fields: [
        {
          id: "bust",
          label: "Bust",
          type: "number",
          required: true,
          help: "",
          options: [],
        },
      ],
      values: { bust: "92" },
      image: reference,
    };
    await context.engine.query(
      "UPDATE sg_order_items SET measurement=$1::jsonb, design=$2::jsonb WHERE id=$3",
      [
        JSON.stringify(measurement),
        JSON.stringify({
          garmentReferences: [],
          choices: [],
          references: [reference],
          notes: "Original design note",
        }),
        first.id,
      ],
    );
    await context.engine.query(
      "INSERT INTO sg_design_assets (id,workspace_id,source,label,kind,view,storage_key,thumbnail_key,checksum) VALUES ($1,1,'upload',$2,'reference','reference','saved-image','saved-thumb','fixture-checksum')",
      [reference.id, reference.label],
    );
    const history = (user: SessionUser, input = {}) =>
      readWorkHistory(workHistoryQuery.parse(input), user);
    assert.equal((await history(a.user)).page.total, 0);
    assert.equal((await historyGet(req())).status, 401);
    assert.equal((await historyGet(req("", ownerToken))).status, 403);
    assert.equal(
      (await historyGet(req(`?member=${b.id}`, a.token))).status,
      400,
    );
    assert.equal((await historyGet(req("?pageSize=51", a.token))).status, 400);
    assert.equal((await historyGet(req("?station=5", a.token))).status, 400);
    assert.throws(
      () =>
        readWorkHistory(workHistoryQuery.parse({}), {
          ...a.user,
          staffId: undefined,
        }),
      /worker account/,
    );

    await assign(orderId, first.id, a.id);
    assert.equal((await history(a.user)).page.total, 0); // Pending work is not completed work.
    await complete(orderId, first.id, a, true);
    assert.equal((await history(a.user)).page.total, 1);
    assert.equal((await history(b.user)).page.total, 0); // Duplicate names do not merge histories.
    assert.equal((await history(a.user)).entries[0].stepName, "Cutting");
    assert.equal((await item(orderId, first.id)).work?.assigneeId, undefined);
    const completionId = (await history(a.user)).entries[0].id;
    const saved = await readWorkHistoryDetail(completionId, a.user);
    assert.equal(saved.entry.snapshot?.material, "Private fabric notes");
    assert.equal(saved.entry.snapshot?.design?.notes, "Original design note");
    assert.equal(saved.entry.snapshot?.measurement?.values.bust, "92");
    assert.ok(saved.entry.snapshot?.assignedAt);
    assert.ok(saved.entry.snapshot?.startedAt);
    assert.equal((await detail(completionId)).status, 401);
    assert.equal((await detail(completionId, ownerToken)).status, 403);
    assert.equal((await detail(completionId, b.token)).status, 404);
    assert.equal((await detail(crypto.randomUUID(), a.token)).status, 404);
    assert.equal((await detail("not-a-uuid", a.token)).status, 404);
    assert.throws(
      () =>
        readWorkHistoryDetail(completionId, { ...a.user, staffId: undefined }),
      /worker account/,
    );
    const detailResponse = await detail(completionId, a.token);
    assert.equal(detailResponse.status, 200);
    assert.equal(detailResponse.headers.get("cache-control"), "no-store");
    const detailBody = JSON.stringify(await detailResponse.json());
    for (const secret of [
      "Private measurer",
      "Private customer",
      "private@example.test",
      "9000000001",
      "Private order",
      "payments",
      "price",
      "workerId",
      "mutationId",
    ])
      assert.ok(
        !detailBody.includes(secret),
        `History detail leaked ${secret}`,
      );
    // Emulate details changing during a later correction of the same piece.
    await context.engine.query(
      "UPDATE sg_order_items SET material='Changed fabric', measurement=jsonb_set(measurement,'{values,bust}','\"96\"'::jsonb), design=$1::jsonb WHERE id=$2",
      [
        JSON.stringify({
          garmentReferences: [],
          choices: [],
          references: [],
          notes: "Changed design",
        }),
        first.id,
      ],
    );
    assert.deepEqual(
      (await readWorkHistoryDetail(completionId, a.user)).entry,
      saved.entry,
    );
    process.env.AWS_ENDPOINT_URL = "http://127.0.0.1:1";
    process.env.AWS_S3_BUCKET_NAME = "isolated-history-images";
    process.env.AWS_ACCESS_KEY_ID = "isolated";
    process.env.AWS_SECRET_ACCESS_KEY = "isolated";
    const imageMock = mock.method(storage(), "send", async () => ({
      Body: { transformToByteArray: async () => new Uint8Array([1, 2, 3]) },
    }));
    try {
      const historicalImage = await imageGet(
        new NextRequest(
          `http://localhost:3000/api/design-library/${reference.id}/image?work=history:${completionId}`,
          { headers: { Cookie: `swapna_session=${a.token}` } },
        ),
        { params: Promise.resolve({ id: reference.id }) },
      );
      assert.equal(historicalImage.status, 200);
      assert.equal(
        historicalImage.headers.get("cache-control"),
        "private, no-store",
      );
      assert.deepEqual(
        new Uint8Array(await historicalImage.arrayBuffer()),
        new Uint8Array([1, 2, 3]),
      );
      const reads = imageMock.mock.callCount();
      await assert.rejects(
        readAccessibleWorkImage(
          reference.id,
          true,
          `history:${completionId}`,
          b.user,
        ),
        /not found/,
      );
      await assert.rejects(
        readAccessibleWorkImage(
          "upload-unrelated",
          true,
          `history:${completionId}`,
          a.user,
        ),
        /not found/,
      );
      await assert.rejects(
        readAccessibleWorkImage(reference.id, true, "history:invalid", a.user),
        /not found/,
      );
      await assert.rejects(
        readAccessibleWorkImage(
          reference.id,
          true,
          `swapna:${orderId}:${first.id}`,
          a.user,
        ),
        /not found/,
      );
      assert.equal(imageMock.mock.callCount(), reads);
    } finally {
      imageMock.mock.restore();
    }
    await assign(orderId, first.id, b.id);
    await complete(orderId, first.id, b);
    assert.deepEqual(
      (await readWorkHistoryDetail(completionId, a.user)).entry,
      saved.entry,
    );
    assert.equal((await history(a.user)).page.total, 1); // Handoff preserves the previous worker's work.
    assert.equal((await history(b.user)).entries[0].stepName, "Sizing");

    // Distinct steps at one station must remain separate completion records.
    await context.engine.query(
      "UPDATE sg_order_items SET workflow=$1::jsonb WHERE id=$2",
      [
        JSON.stringify({
          id: "custom-sewing",
          name: "Custom sewing",
          revision: 1,
          position: 0,
          version: 1,
          steps: [
            { id: "seam", name: "Sew the seam", station: 0 },
            { id: "trim", name: "Trim the seam", station: 0 },
          ],
        }),
        second.id,
      ],
    );
    await assign(orderId, second.id, a.id);
    await complete(orderId, second.id, a);
    await assign(orderId, second.id, a.id);
    await complete(orderId, second.id, a);
    assert.equal((await history(a.user)).page.total, 3);
    assert.deepEqual(
      new Set(
        (await history(a.user, { q: "seam" })).entries.map(
          (row) => row.stepName,
        ),
      ),
      new Set(["Sew the seam", "Trim the seam"]),
    );
    const page1 = await history(a.user, { pageSize: 1 });
    const page2 = await history(a.user, { pageSize: 1, page: 2 });
    assert.equal(page1.page.pageCount, 3);
    assert.notEqual(page1.entries[0].id, page2.entries[0].id);
    assert.equal(
      (await history(a.user, { page: 4, pageSize: 1 })).entries.length,
      0,
    );
    assert.equal((await history(a.user, { station: "1" })).page.total, 0);
    assert.equal((await history(b.user, { station: "1" })).page.total, 1);
    assert.equal((await history(a.user, { q: order.number })).page.total, 3);
    assert.equal((await history(a.user, { q: "%" })).page.total, 0);

    // Owner-confirmed completion credits the assigned worker; a correction is not completion.
    await assign(orderId, first.id, a.id);
    await send({
      type: "piece.advance",
      orderId,
      pieceId: first.id,
      expectedStation: 2,
    });
    assert.equal((await history(a.user)).page.total, 4);
    const unchanged = (await history(a.user)).entries;
    await send({
      type: "piece.rework",
      orderId,
      pieceId: first.id,
      station: 2,
      reason: "Check the seam",
    });
    assert.deepEqual((await history(a.user)).entries, unchanged);

    const person = (await readWorkspace()).data.staff.find(
      (p) => p.id === a.id,
    )!;
    await send({
      type: "team.save",
      id: a.id,
      name: "Renamed worker",
      worker: person.worker!,
      expectedRevision: person.worker!.revision,
    });
    assert.equal((await history(a.user)).page.total, 4);
    // Emulate an upgrade from old code, which had workflow history but no completion receipts.
    await context.engine.exec("DELETE FROM sg_work_completions");
    await context.engine.exec(workHistory);
    await context.engine.exec(workHistory); // Recovery is idempotent.
    assert.equal((await history(a.user)).page.total, 3);
    assert.equal((await history(b.user)).page.total, 1);
    const recoveredId = (await history(a.user)).entries[0].id;
    assert.equal(
      (await readWorkHistoryDetail(recoveredId, a.user)).entry.snapshot,
      null,
    );
    assert.deepEqual(
      new Set((await history(a.user)).entries.map((row) => row.stepName)),
      new Set(["Cutting", "Sew the seam", "Trim the seam"]),
    );
    // The owner shared their old name but their historical advance cannot be attributed from a name.
    assert.equal(
      (await context.engine.query("SELECT * FROM sg_work_completions")).rows
        .length,
      4,
    );

    // Completion receipts persist through JSON rollback, new JSON commands and recutover.
    const prior = (await history(a.user)).entries;
    await transition("rollback");
    assert.deepEqual((await history(a.user)).entries, prior);
    await assign(orderId, first.id, a.id);
    await complete(orderId, first.id, a, true);
    assert.equal((await history(a.user)).page.total, 4);
    const jsonCompletion = (await history(a.user)).entries[0].id;
    const jsonDetail = (await readWorkHistoryDetail(jsonCompletion, a.user))
      .entry;
    assert.equal(jsonDetail.snapshot?.material, "Changed fabric");
    await transition("cutover");
    assert.deepEqual(
      (await readWorkHistoryDetail(jsonCompletion, a.user)).entry,
      jsonDetail,
    );
    assert.equal((await history(a.user)).page.total, 4);
    for (const station of [3, 4])
      await send({
        type: "piece.advance",
        orderId,
        pieceId: first.id,
        expectedStation: station,
      });
    await send({ type: "order.deliver", orderId });
    assert.deepEqual(
      (await readWorkHistoryDetail(jsonCompletion, a.user)).entry,
      jsonDetail,
    );
    assert.equal((await history(a.user)).page.total, 4);
    const response = await historyGet(req("", a.token));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
    const body = JSON.stringify(await response.json());
    for (const secret of [
      "private@example.test",
      "9000000001",
      "Private customer",
      "Private order",
      "Private fabric",
      "price",
      "payments",
      "measurements",
      "workerId",
      "mutationId",
    ])
      assert.ok(!body.includes(secret), secret);
  } finally {
    await context.engine.close();
  }
});
