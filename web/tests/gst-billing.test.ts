import { test } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { isolatedDatabase } from "./helpers/isolated-database";
import { ensureSchema } from "../src/db";
import { applyMutation } from "../src/shared/compat/workspace-mutations";
import {
  createPreviewWorkspace,
  total,
  balance,
  paid,
  shopDate,
} from "../src/shared/workspace";
import { defaultCatalogue } from "../src/features/settings/domain/catalogue";
import {
  gstSettingsSchema,
  type GstSettings,
} from "../src/features/billing/contracts/gst";
import {
  calculateGst,
  gstSettingsFor,
  totalWithGst,
} from "../src/features/billing/domain/gst";
import { readCatalogue } from "../src/services/catalogue-storage";
import {
  executeWorkspaceCommand,
  readWorkspace,
} from "../src/services/workspace-service";
import {
  readOrder,
  readBilling,
  exportOrderRows,
} from "../src/services/order-read-service";
import {
  storageStatus,
  transitionWorkspaceStorage,
} from "../src/services/storage-migration-service";
import { validateWorkspace } from "../src/db/workspace-validation";
import { billingQuery } from "../src/features/billing/contracts/query";
import { exportQuery } from "../src/features/orders/contracts/query";
import type { WorkspaceMutation } from "../src/shared/contracts/command";
import type { Intake } from "../src/features/orders/contracts/intake";
import { POST as billingPost } from "../src/app/api/billing/route";

const exclusive: GstSettings = {
  enabled: true,
  rateBps: 1800,
  priceMode: "exclusive",
  gstin: "32ABCDE1234F1Z5",
};
const owner = { name: "GST Test Owner", email: "gst@example.test" };
const send = (action: WorkspaceMutation, mutationId = crypto.randomUUID()) =>
  executeWorkspaceCommand({ action, mutationId }, owner);
async function transition(direction: "cutover" | "rollback") {
  const status = await storageStatus();
  return transitionWorkspaceStorage({
    direction,
    expectedRevision: status.revision,
    expectedChecksum: status.checksum,
    backupReference: "isolated-gst-test",
  });
}

test("GST rounds in paise, supports inclusive/exclusive/zero/disabled rates, and validates settings", () => {
  const gst = calculateGst(100_000, exclusive)!;
  assert.equal(gst.amount, 18_000);
  assert.equal(gst.taxableAmount, 100_000);
  assert.equal(totalWithGst(100_000, gst), 118_000);
  const included = calculateGst(118_000, {
    ...exclusive,
    priceMode: "inclusive",
  })!;
  assert.equal(included.amount, 18_000);
  assert.equal(included.taxableAmount, 100_000);
  assert.equal(totalWithGst(118_000, included), 118_000);
  assert.equal(calculateGst(10, { ...exclusive, rateBps: 500 })!.amount, 1);
  assert.equal(
    calculateGst(100_000, { ...exclusive, rateBps: 525 })!.amount,
    5250,
  );
  assert.equal(calculateGst(100_000, { ...exclusive, rateBps: 0 })!.amount, 0);
  assert.equal(calculateGst(100_000, gstSettingsFor()), undefined);
  assert.equal(totalWithGst(100_000), 100_000);
  for (const rateBps of [-1, 18.5, 10_001, Infinity])
    assert.equal(
      gstSettingsSchema.safeParse({ ...exclusive, rateBps }).success,
      false,
    );
  assert.equal(
    gstSettingsSchema.safeParse({ ...exclusive, gstin: "bad" }).success,
    false,
  );
  assert.equal(
    gstSettingsSchema.parse({ ...exclusive, gstin: "32abcde1234f1z5" }).gstin,
    exclusive.gstin,
  );
});

test("preview applies GST once to unpaid orders and keeps old bills stable when settings change", () => {
  const base = createPreviewWorkspace();
  const catalogue = defaultCatalogue();
  catalogue.gst = exclusive;
  let data = applyMutation(
    base,
    { type: "settings.save", catalogue },
    owner.name,
  ).data;
  assert.equal(data.orders[0].gst, undefined);
  const oldTotal = total(data.orders[0]);
  data = applyMutation(
    data,
    {
      type: "billing.apply-gst",
      orderId: data.orders[0].id,
      settings: exclusive,
    },
    owner.name,
  ).data;
  assert.equal(total(data.orders[0]), oldTotal * 1.18);
  assert.equal(
    balance(data.orders[0]),
    total(data.orders[0]) - paid(data.orders[0]),
  );
  const saved = structuredClone(data.orders[0]);
  assert.throws(
    () =>
      applyMutation(
        data,
        { type: "billing.apply-gst", orderId: saved.id, settings: exclusive },
        owner.name,
      ),
    /already saved/,
  );
  data = applyMutation(
    data,
    {
      type: "settings.save",
      catalogue: { ...data.catalogue!, gst: { ...exclusive, rateBps: 500 } },
    },
    owner.name,
  ).data;
  assert.deepEqual(data.orders[0], saved);
  assert.throws(
    () =>
      applyMutation(
        data,
        {
          type: "billing.apply-gst",
          orderId: data.orders[1].id,
          settings: exclusive,
        },
        owner.name,
      ),
    /GST settings changed/,
  );
  const settled = data.orders.find((o) => o.status === "delivered")!;
  assert.throws(
    () =>
      applyMutation(
        data,
        {
          type: "billing.apply-gst",
          orderId: settled.id,
          settings: data.catalogue!.gst,
        },
        owner.name,
      ),
    /open order/,
  );
  const tampered = structuredClone(data);
  tampered.orders[0].gst!.amount++;
  assert.throws(() => validateWorkspace(tampered), /inconsistent GST/);
});

test("GST persists through intake, billing queries, payments, delivery, JSON rollback and recutover", async () => {
  const { engine } = isolatedDatabase();
  try {
    await ensureSchema();
    await engine.query(
      "INSERT INTO sg_owner(id, name, email, password_hash, salt) VALUES (1, $1, $2, 'test-hash', 'test-salt')",
      [owner.name, owner.email],
    );
    const customer = await send({
      type: "customer.save",
      customer: {
        id: "gst-customer",
        name: "Sample GST Customer",
        phone: "9876543210",
        email: "",
        notes: "",
        measurements: {},
      },
    });
    const customerId = customer.resultId!;
    const create = (price: number, advance = 0): WorkspaceMutation => ({
      type: "order.create",
      customerId,
      dueDate: shopDate(),
      priority: "normal",
      notes: "",
      items: [{ garment: "Blouse", material: "Cotton", price }],
      advance,
      method: "Cash",
    });
    const legacy = await send(create(100_000));
    const legacyId = legacy.resultId!;
    const settledLegacy = await send(create(100_000, 100_000));
    await transition("cutover");
    const catalogue = defaultCatalogue();
    catalogue.gst = exclusive;
    await send({ type: "settings.save", catalogue });
    assert.deepEqual((await readCatalogue()).catalogue.gst, exclusive);
    assert.equal(
      (await readOrder(legacyId, { page: 1, pageSize: 20 })).data.orders[0].gst,
      undefined,
    );
    const apply = {
      type: "billing.apply-gst" as const,
      orderId: legacyId,
      settings: exclusive,
    };
    const mutationId = crypto.randomUUID();
    await send(apply, mutationId);
    await send(apply, mutationId);
    let legacyOrder = (await readOrder(legacyId, { page: 1, pageSize: 20 }))
      .data.orders[0];
    assert.equal(legacyOrder.gst!.amount, 18_000);
    assert.equal(total(legacyOrder), 118_000);
    assert.equal(
      (
        await engine.query(
          "SELECT * FROM sg_activity WHERE order_id=$1 AND title='GST applied'",
          [legacyId],
        )
      ).rows.length,
      1,
    );
    await assert.rejects(send(apply), /already saved/);
    await assert.rejects(
      send({ ...apply, orderId: settledLegacy.resultId! }),
      /unpaid balance/,
    );
    const action: Intake = {
      type: "order.intake",
      customer: { kind: "existing", id: customerId },
      gstSettings: exclusive,
      dueDate: shopDate(),
      priority: "normal",
      notes: "",
      advance: 0,
      method: "Cash",
      items: [
        {
          garmentId: "garment-blouse",
          garmentRevision: 1,
          quantity: 2,
          price: 100_025,
          material: "Silk",
          measurements: {
            values: {},
            extraFields: [],
            source: "new",
            confirmed: false,
            saveProfile: false,
            expectedProfileRevision: 0,
          },
        },
      ],
    };
    const intake = await send(action);
    const intakeId = intake.resultId!;
    const intakeOrder = (await readOrder(intakeId, { page: 1, pageSize: 20 }))
      .data.orders[0];
    assert.equal(intakeOrder.gst!.amount, 36_009);
    assert.equal(total(intakeOrder), 236_059);
    const newOrder = await send(create(100_000, 118_000));
    assert.equal(
      balance(newOrder.data.orders.find((o) => o.id === newOrder.resultId)!),
      0,
      "a full advance may include GST",
    );
    await assert.rejects(send(create(100_000, 118_001)), /advance/);
    await assert.rejects(send(create(100_000_000)), /total is too large/);
    const settings = (await readCatalogue()).catalogue;
    settings.gst = { ...exclusive, priceMode: "inclusive" };
    await send({ type: "settings.save", catalogue: settings });
    await assert.rejects(send(action), /GST settings changed/);
    const includedResult = await send(create(118_000));
    const includedOrder = (
      await readOrder(includedResult.resultId!, { page: 1, pageSize: 20 })
    ).data.orders[0];
    assert.equal(total(includedOrder), 118_000);
    assert.equal(includedOrder.gst!.taxableAmount, 100_000);
    legacyOrder = (await readOrder(legacyId, { page: 1, pageSize: 20 })).data
      .orders[0];
    assert.equal(legacyOrder.gst!.priceMode, "exclusive");
    await send({
      type: "payment.record",
      orderId: legacyId,
      amount: 100_000,
      method: "Cash",
    });
    for (let station = 0; station < 5; station++)
      await send({
        type: "piece.advance",
        orderId: legacyId,
        pieceId: legacyOrder.items[0].id,
        expectedStation: station,
      });
    await assert.rejects(
      send({ type: "order.deliver", orderId: legacyId }),
      /Settle the balance/,
    );
    let billing = await readBilling(billingQuery.parse({ filter: "pending" }));
    assert.ok(
      billing.data.orders.some((o) => o.id === legacyId),
      "GST-only balances remain pending in SQL",
    );
    assert.equal(billing.totals.pending, 18_000 + 236_059 + 118_000);
    await assert.rejects(
      send({
        type: "payment.record",
        orderId: legacyId,
        amount: 18_001,
        method: "Cash",
      }),
      /remaining balance/,
    );
    await send({
      type: "payment.record",
      orderId: legacyId,
      amount: 18_000,
      method: "Cash",
    });
    await send({ type: "order.deliver", orderId: legacyId });
    billing = await readBilling(billingQuery.parse({ filter: "settled" }));
    assert.ok(billing.data.orders.some((o) => o.id === legacyId));
    const { csv } = await exportOrderRows(exportQuery.parse({}));
    assert.ok(csv.includes("2360.59"), "CSV includes the GST total");
    const before = (await readWorkspace()).data;
    await transition("rollback");
    assert.deepEqual((await readWorkspace()).data, before);
    assert.equal(
      (await readBilling(billingQuery.parse({}))).totals.pending,
      354_059,
    );
    await transition("cutover");
    assert.deepEqual((await readWorkspace()).data, before);
    const disabled = (await readCatalogue()).catalogue;
    disabled.gst = { ...exclusive, enabled: false };
    await send({ type: "settings.save", catalogue: disabled });
    const withoutGst = await send(create(100_000));
    assert.equal(withoutGst.data.orders[0].gst, undefined);
    assert.equal(total(withoutGst.data.orders[0]), 100_000);
    assert.equal(
      (await readOrder(intakeId, { page: 1, pageSize: 20 })).data.orders[0].gst!
        .amount,
      36_009,
    );
    const response = await billingPost(
      new NextRequest("http://localhost/api/billing", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost",
        },
        body: JSON.stringify({
          mutationId: crypto.randomUUID(),
          action: apply,
        }),
      }),
    );
    assert.equal(response.status, 401);
  } finally {
    await engine.close();
  }
});
