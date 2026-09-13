import { test } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { isolatedDatabase } from "./helpers/isolated-database";
import {
  authenticate,
  getUserSession,
  getOwnerSession,
} from "../src/services/auth-service";
import {
  executeWorkspaceCommand,
  readWorkspace,
} from "../src/services/workspace-service";
import {
  storageStatus,
  transitionWorkspaceStorage,
} from "../src/services/storage-migration-service";
import { readWork, readTeamMembers } from "../src/services/team-read-service";
import {
  defaultAssignmentSettings,
  distribute,
  openPieces,
  workOf,
} from "../src/features/team/domain/assignment";
import { applyMutation } from "../src/shared/compat/workspace-mutations";
import {
  createPreviewWorkspace,
  shopDate,
  type Workspace,
} from "../src/shared/workspace";
import { workQuery, type Worker } from "../src/features/team/contracts/team";
import type { WorkspaceMutation } from "../src/shared/contracts/command";
import { GET as workGet, POST as workPost } from "../src/app/api/work/route";
import { GET as teamGet, POST as teamPost } from "../src/app/api/team/route";
import { GET as ordersGet } from "../src/app/api/orders/route";
import { GET as sessionGet } from "../src/app/api/session/route";
import { parseWorkCode } from "../src/features/qr-tags/domain/code";
import { readAccessibleWorkImage } from "../src/services/work-image-service";
import { lookupOrder } from "../src/services/order-read-service";

const profile = (email: string, skills = [0, 1, 2, 3, 4]): Worker => ({
  email,
  skills,
  active: true,
  available: true,
  capacityMinutes: 480,
  revision: 1,
});
const owner = { name: "Team Test Owner", email: "team-owner@example.test" };
const password = "team-test-password-only";
function fixture(): Workspace {
  const data = createPreviewWorkspace();
  data.orders = data.orders.slice(0, 1);
  data.orders[0].status = "received";
  data.orders[0].priority = "normal";
  data.orders[0].items = Array.from({ length: 8 }, (_, i) => ({
    ...data.orders[0].items[0],
    id: `task-${i}`,
    station: 0,
  }));
  data.staff = [
    {
      id: "a",
      name: "Single skill",
      role: "Worker",
      station: "Cutting",
      color: "sage",
      worker: profile("a@example.test", [0]),
    },
    {
      id: "b",
      name: "Multiple skills",
      role: "Worker",
      station: "Cutting · Sizing",
      color: "sage",
      worker: profile("b@example.test", [0, 1]),
    },
  ];
  data.assignmentSettings = {
    ...defaultAssignmentSettings(),
    balanceBy: "pieces",
  };
  return data;
}
test("distribution balances equal pieces, respects skills, availability, capacity, priority and existing work", () => {
  const data = fixture();
  assert.equal(
    distribute(data, new Date().toISOString(), () => {}),
    8,
  );
  assert.equal(
    data.orders[0].items.filter((i) => i.work?.assigneeId === "a").length,
    4,
  );
  assert.equal(
    data.orders[0].items.filter((i) => i.work?.assigneeId === "b").length,
    4,
  );
  const assigned = structuredClone(data.orders);
  assert.equal(
    distribute(data, new Date().toISOString(), () => {}),
    0,
  );
  assert.deepEqual(data.orders, assigned);
  const limited = fixture();
  limited.staff[0].worker!.capacityMinutes = 30;
  limited.staff[1].worker!.available = false;
  assert.equal(
    distribute(limited, new Date().toISOString(), () => {}),
    1,
  );
  limited.staff[1].worker!.available = true;
  limited.staff[1].worker!.skills = [1];
  assert.equal(
    distribute(limited, new Date().toISOString(), () => {}),
    0,
  );
  const prioritized = fixture();
  prioritized.orders[0].items = prioritized.orders[0].items.slice(0, 1);
  prioritized.orders.push({
    ...structuredClone(prioritized.orders[0]),
    id: "urgent",
    number: "SG-9000",
    priority: "urgent",
    items: [{ ...prioritized.orders[0].items[0], id: "urgent-piece" }],
  });
  prioritized.staff = prioritized.staff.slice(0, 1);
  prioritized.staff[0].worker!.capacityMinutes = 30;
  distribute(prioritized, new Date().toISOString(), () => {});
  assert.equal(prioritized.orders[1].items[0].work?.assigneeId, "a");
  assert.equal(prioritized.orders[0].items[0].work, undefined);
  const effort = fixture();
  effort.assignmentSettings!.balanceBy = "effort";
  effort.staff[1].worker!.capacityMinutes = 240;
  distribute(effort, new Date().toISOString(), () => {});
  assert.equal(
    effort.orders[0].items.filter((i) => i.work?.assigneeId === "a").length,
    5,
  );
  assert.equal(
    effort.orders[0].items.filter((i) => i.work?.assigneeId === "b").length,
    3,
  );
});
test("manual holds, blocked stages, stale updates, and stage handoff are guarded in preview", () => {
  let data = fixture();
  const target = {
    orderId: data.orders[0].id,
    pieceId: data.orders[0].items[0].id,
    expectedStation: 0,
    expectedVersion: 0,
  };
  data = applyMutation(
    data,
    { type: "work.assign", ...target, assigneeId: null },
    "Owner",
  ).data;
  assert.equal(
    distribute(data, new Date().toISOString(), () => {}),
    7,
  );
  assert.equal(data.orders[0].items[0].work?.assigneeId, undefined);
  const assign = {
    type: "work.assign" as const,
    ...target,
    expectedVersion: 1,
    assigneeId: "a",
  };
  data = applyMutation(data, assign, "Owner").data;
  assert.throws(() => applyMutation(data, assign, "Owner"), /changed/);
  const command = (
    operation: "start" | "block" | "resume" | "complete",
    reason?: string,
  ) => ({
    type: "work.update" as const,
    ...target,
    expectedVersion: workOf(data.orders[0].items[0]).version,
    operation,
    reason,
  });
  assert.throws(
    () => applyMutation(data, command("complete"), "Owner"),
    /Start or resume/,
  );
  data = applyMutation(data, command("start"), "Owner").data;
  assert.throws(() => applyMutation(data, command("block"), "Owner"), /reason/);
  data = applyMutation(
    data,
    command("block", "Waiting for fabric"),
    "Owner",
  ).data;
  assert.throws(
    () =>
      applyMutation(
        data,
        {
          type: "piece.advance",
          orderId: target.orderId,
          pieceId: target.pieceId,
          expectedStation: 0,
        },
        "Owner",
      ),
    /Resume blocked/,
  );
  data = applyMutation(data, command("resume"), "Owner").data;
  data.assignmentSettings!.automatic = true;
  data = applyMutation(data, command("complete"), "Owner").data;
  assert.equal(data.orders[0].items[0].station, 1);
  assert.equal(data.orders[0].items[0].work?.assigneeId, "b");
  assert.equal(data.orders[0].items[0].work?.status, "pending");
  assert.equal(parseWorkCode("https://untrusted.test"), null);
  assert.equal(parseWorkCode("swapna:order:piece:extra"), null);
  assert.deepEqual(parseWorkCode("swapna:order-1:piece-1"), {
    orderKey: "order-1",
    pieceId: "piece-1",
  });
});
test("real account login, scoped APIs, assignment lifecycle, retries, history and storage rollback", async () => {
  const context = isolatedDatabase();
  process.env.SETUP_TOKEN = "team-test-setup-only";
  process.env.APP_ORIGIN = "http://localhost:3000";
  const send = (action: WorkspaceMutation, mutationId = crypto.randomUUID()) =>
    executeWorkspaceCommand({ action, mutationId }, owner);
  const req = (path: string, token: string, method = "GET", body?: unknown) =>
    new NextRequest(`http://localhost:3000${path}`, {
      method,
      headers: {
        Origin: "http://localhost:3000",
        Cookie: `swapna_session=${token}`,
        "Content-Type": "application/json",
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  async function transition(direction: "cutover" | "rollback") {
    const s = await storageStatus();
    return transitionWorkspaceStorage({
      direction,
      expectedRevision: s.revision,
      expectedChecksum: s.checksum,
      backupReference: "isolated-team-test",
    });
  }
  try {
    const ownerToken = await authenticate({
      action: "setup",
      ...owner,
      password,
      setupToken: process.env.SETUP_TOKEN,
    });
    await transition("cutover");
    const a = await send({
      type: "team.save",
      name: "Test Worker A",
      worker: profile("worker-a@example.test"),
      password,
      expectedRevision: 0,
    });
    const b = await send({
      type: "team.save",
      name: "Test Worker B",
      worker: profile("worker-b@example.test"),
      password,
      expectedRevision: 0,
    });
    const aToken = await authenticate({
      action: "signin",
      email: "worker-a@example.test",
      password,
    });
    const bToken = await authenticate({
      action: "signin",
      email: "worker-b@example.test",
      password,
    });
    assert.equal(await getOwnerSession(aToken), null);
    assert.equal((await getUserSession(aToken))?.staffId, a.resultId);
    assert.equal(
      (await (await sessionGet(req("/api/session", aToken))).json()).owner.role,
      "worker",
    );
    for (const [path, handler] of [
      ["/api/orders", ordersGet],
      ["/api/team", teamGet],
    ] as const)
      assert.ok((await handler(req(path, aToken))).status >= 400);
    assert.ok(
      (
        await teamPost(
          req("/api/team", aToken, "POST", {
            mutationId: crypto.randomUUID(),
            action: { type: "team.distribute" },
          }),
        )
      ).status >= 400,
    );
    const customer = await send({
      type: "customer.save",
      customer: {
        id: "private-test-customer",
        name: "Private Customer",
        phone: "9000000099",
        email: "private@example.test",
        notes: "Private contact notes",
        measurements: {},
      },
    });
    const created = await send({
      type: "order.create",
      customerId: customer.resultId!,
      items: Array.from({ length: 3 }, () => ({
        garment: "Blouse",
        material: "Cotton lining",
        price: 10000,
      })),
      priority: "urgent",
      dueDate: shopDate(),
      notes: "Order note",
      advance: 0,
      method: "Cash",
    });
    const waiting = await readWork(
      workQuery.parse({ status: "unassigned" }),
      owner,
    );
    assert.equal(waiting.page.total, 3);
    assert.match(waiting.pieces[0].unassignedReason!, /Choose a worker/);
    await send({
      type: "team.settings",
      settings: { ...defaultAssignmentSettings(), automatic: true },
    });
    const current = await readWorkspace();
    const tasks = openPieces(current.data);
    assert.equal(tasks.length, 3);
    assert.ok(tasks.every(({ item }) => item.work?.assigneeId));
    const aQueue = await readWork(
      workQuery.parse({}),
      (await getUserSession(aToken))!,
    );
    assert.ok(aQueue.pieces.length > 0 && aQueue.pieces.length < 3);
    const serialized = JSON.stringify(aQueue);
    for (const secret of [
      "Private Customer",
      "9000000099",
      "private@example.test",
      "payments",
      "price",
      "password",
      "salt",
    ])
      assert.ok(
        !serialized.includes(secret),
        `worker response leaked ${secret}`,
      );
    assert.equal(
      (await workGet(req(`/api/work?member=${b.resultId}`, aToken))).status,
      403,
    );
    const own = aQueue.pieces[0];
    await assert.rejects(
      lookupOrder({ code: `swapna:${own.order.id}:wrong-piece` }),
      /piece code/,
    );
    await assert.rejects(
      readAccessibleWorkImage(
        "upload-unrelated",
        true,
        null,
        (await getUserSession(aToken))!,
      ),
      /not found in your work/,
    );
    await assert.rejects(
      readAccessibleWorkImage(
        "upload-unrelated",
        true,
        `swapna:${own.order.id}:${own.item.id}`,
        (await getUserSession(aToken))!,
      ),
      /not found in your work/,
    );
    const code = `swapna:${own.order.id}:${own.item.id}`;
    assert.equal(
      (
        await (
          await workGet(
            req(`/api/work?code=${encodeURIComponent(code)}`, aToken),
          )
        ).json()
      ).pieces.length,
      1,
    );
    assert.equal(
      (
        await (
          await workGet(
            req(`/api/work?code=${encodeURIComponent(code)}`, bToken),
          )
        ).json()
      ).pieces.length,
      0,
    );
    assert.equal(
      (
        await workGet(
          req(
            `/api/work?code=${encodeURIComponent(`swapna:${own.order.id}:wrong-piece`)}`,
            aToken,
          ),
        )
      ).status,
      200,
    );
    const start = {
      type: "work.update" as const,
      orderId: own.order.id,
      pieceId: own.item.id,
      expectedStation: own.item.station,
      expectedVersion: own.item.work!.version,
      operation: "start" as const,
    };
    assert.equal(
      (
        await workPost(
          req("/api/work", bToken, "POST", {
            mutationId: crypto.randomUUID(),
            action: start,
          }),
        )
      ).status,
      403,
    );
    const mutationId = crypto.randomUUID();
    const first = await workPost(
      req("/api/work", aToken, "POST", { mutationId, action: start }),
    );
    assert.equal(first.status, 200);
    const body = await first.json();
    assert.equal(body.data, undefined);
    assert.equal(body.resultId, own.item.id);
    assert.equal(
      (
        await workPost(
          req("/api/work", aToken, "POST", { mutationId, action: start }),
        )
      ).status,
      200,
    );
    assert.equal(
      (
        await workPost(
          req("/api/work", aToken, "POST", {
            mutationId: crypto.randomUUID(),
            action: start,
          }),
        )
      ).status,
      409,
    );
    assert.equal(
      (
        await workPost(
          req("/api/work", bToken, "POST", { mutationId, action: start }),
        )
      ).status,
      409,
    );
    const complete = {
      ...start,
      expectedVersion: start.expectedVersion + 1,
      operation: "complete" as const,
    };
    assert.equal(
      (
        await workPost(
          req("/api/work", aToken, "POST", {
            mutationId: crypto.randomUUID(),
            action: complete,
          }),
        )
      ).status,
      200,
    );
    assert.equal(
      (
        await context.engine.query(
          "SELECT * FROM sg_workflow_history WHERE kind='advance'",
        )
      ).rows.length,
      1,
    );
    assert.equal(
      (await context.engine.query("SELECT * FROM sg_domain_events")).rows
        .length,
      (await context.engine.query("SELECT * FROM sg_mutations")).rows.length,
    );
    const members = await readTeamMembers({
      page: 1,
      pageSize: 1,
      q: "Test Worker",
    });
    assert.equal(members.page.total, 2);
    assert.equal(members.data.staff.length, 1);
    assert.ok(Object.values(members.loads)[0].minutes > 0);
    const before = await readWorkspace();
    await transition("rollback");
    assert.deepEqual((await readWorkspace()).data, before.data);
    const jsonQueue = await readWork(
      workQuery.parse({}),
      (await getUserSession(aToken))!,
    );
    await transition("cutover");
    assert.deepEqual(
      (await readWork(workQuery.parse({}), (await getUserSession(aToken))!))
        .pieces,
      jsonQueue.pieces,
    );
    assert.deepEqual((await readWorkspace()).data, before.data);
    // Resetting credentials revokes old sessions, preserves the owner, and never stores plaintext.
    const saved = before.data.staff.find((p) => p.id === a.resultId)!;
    await send({
      type: "team.save",
      id: saved.id,
      name: saved.name,
      worker: saved.worker!,
      expectedRevision: saved.worker!.revision,
      password: "updated-test-password-only",
    });
    assert.equal(await getUserSession(aToken), null);
    assert.ok(await getUserSession(ownerToken));
    await assert.rejects(
      authenticate({ action: "signin", email: saved.worker!.email, password }),
      /incorrect/,
    );
    const stored = await context.engine.query<{ password_hash: string }>(
      "SELECT password_hash FROM sg_worker_accounts",
    );
    assert.ok(stored.rows.every((r) => r.password_hash !== password));
    const newToken = await authenticate({
      action: "signin",
      email: saved.worker!.email,
      password: "updated-test-password-only",
    });
    const pending = (
      await readWork(
        workQuery.parse({ status: "pending" }),
        (await getUserSession(newToken))!,
      )
    ).pieces[0];
    assert.ok(pending);
    const begin = {
      type: "work.update" as const,
      orderId: pending.order.id,
      pieceId: pending.item.id,
      expectedStation: pending.item.station,
      expectedVersion: pending.item.work!.version,
      operation: "start" as const,
    };
    assert.equal(
      (
        await workPost(
          req("/api/work", newToken, "POST", {
            mutationId: crypto.randomUUID(),
            action: begin,
          }),
        )
      ).status,
      200,
    );
    const person = (await readWorkspace()).data.staff.find(
      (p) => p.id === saved.id,
    )!;
    await send({
      type: "team.save",
      id: person.id,
      name: person.name,
      worker: { ...person.worker!, active: false },
      expectedRevision: person.worker!.revision,
    });
    assert.equal(await getUserSession(newToken), null);
    const disabled = (await readWorkspace()).data.orders
      .find((o) => o.id === pending.order.id)!
      .items.find((i) => i.id === pending.item.id)!;
    assert.equal(disabled.work!.status, "in_progress");
    assert.equal(disabled.work!.assigneeId, person.id);
    await assert.rejects(
      authenticate({
        action: "signin",
        email: person.worker!.email,
        password: "updated-test-password-only",
      }),
      /incorrect/,
    );
    assert.equal(
      (await readWorkspace()).data.orders.find(
        (o) => o.id === created.resultId,
      )!.items.length,
      3,
    );
  } finally {
    await context.engine.close();
  }
});
