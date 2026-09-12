import { test } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { isolatedDatabase } from "./helpers/isolated-database";
import { ensureSchema } from "../src/db";
import {
  emptyWorkspace,
  shopDate,
  isOpen,
  prioritySort,
  balance,
  paid,
  type Workspace,
} from "../src/shared/workspace";
import { transitionWorkspaceStorage } from "../src/services/storage-migration-service";
import { directoryQuery, pageQuery } from "../src/shared/contracts/query-input";
import {
  ordersQuery,
  exportQuery,
} from "../src/features/orders/contracts/query";
import { billingQuery } from "../src/features/billing/contracts/query";
import { workflowQuery } from "../src/features/workflow/contracts/query";
import {
  readOrders,
  readOrder,
  readBilling,
  readSearch,
  lookupOrder,
  exportOrderRows,
} from "../src/services/order-read-service";
import {
  readCustomers,
  readCustomer,
} from "../src/services/customer-read-service";
import { readDashboard } from "../src/services/dashboard-read-service";
import { readWorkflow } from "../src/services/workflow-read-service";
import {
  readReports,
  readTeam,
  readShell,
} from "../src/services/shop-read-service";
import { hashToken } from "../src/shared/server/crypto";
import { GET as ordersGet } from "../src/app/api/orders/route";
import { GET as customerGet } from "../src/app/api/customers/[id]/route";
import { GET as exportGet } from "../src/app/api/orders/export/route";

const token = "b".repeat(64);
function fixture(): Workspace {
  const data = emptyWorkspace(),
    today = shopDate(),
    start = new Date(`${today}T00:00:00+05:30`).getTime();
  const at = (ms: number) => new Date(start + ms).toISOString();
  data.customers = Array.from({ length: 31 }, (_, i) => ({
    id: `customer-${i}`,
    name: i === 0 ? '=Percent%_\\ "Customer"' : `Customer ${i}`,
    phone: `980000${String(i).padStart(4, "0")}`,
    email: "",
    notes: "",
    measurements: { Bust: "34" },
    ...(i === 0
      ? {
          measurementHistory: [{ date: at(-86400000), values: { Bust: "32" } }],
        }
      : {}),
  }));
  data.orders = Array.from({ length: 31 }, (_, i) => ({
    id: `order-${i}`,
    number: `SG-${1000 + i}`,
    customerId: i < 24 ? "customer-0" : `customer-${i}`,
    priority: i % 3 === 0 ? "urgent" : i % 3 === 1 ? "high" : "normal",
    dueDate:
      i % 3 === 0
        ? shopDate(new Date(start - 86400000))
        : i % 3 === 1
          ? today
          : shopDate(new Date(start + 86400000)),
    createdAt: at(-2 * 86400000),
    status:
      i === 28
        ? "ready"
        : i === 29
          ? "delivered"
          : i === 30
            ? "cancelled"
            : "in_progress",
    notes: "",
    items: [
      {
        id: `piece-${i}`,
        garment: i === 0 ? "Silk%_\\ blouse" : "Blouse",
        material: "Cotton",
        station: i >= 28 ? 5 : i % 5,
        price: 10000,
      },
    ],
    payments:
      i === 0
        ? [
            { id: "payment-before", amount: 100, method: "cash", date: at(-1) },
            { id: "payment-start", amount: 200, method: "cash", date: at(0) },
            {
              id: "payment-end",
              amount: 300,
              method: "cash",
              date: at(86400000 - 1),
            },
            {
              id: "payment-after",
              amount: 400,
              method: "cash",
              date: at(86400000),
            },
          ]
        : i === 29
          ? [
              {
                id: "payment-settled",
                amount: 10000,
                method: "cash",
                date: at(1000),
              },
            ]
          : i === 30
            ? [
                {
                  id: "payment-cancelled",
                  amount: 500,
                  method: "cash",
                  date: at(1000),
                },
              ]
            : [],
    ...(i === 29 ? { deliveredAt: at(1000) } : {}),
  }));
  data.staff = Array.from({ length: 24 }, (_, i) => ({
    id: `staff-${i}`,
    name: `Staff ${i}`,
    role: "Tailor",
    station: "Stitching",
    color: "#000000",
  }));
  data.activity = Array.from({ length: 27 }, (_, i) => ({
    id: `activity-${i}`,
    orderId: "order-0",
    title: `Activity ${i}`,
    detail: "Test",
    time: at(1000 + i),
  }));
  data.closedDays = Array.from({ length: 24 }, (_, i) =>
    shopDate(new Date(start - i * 86400000)),
  );
  data.dayReports = data.closedDays.map((date, i) => ({
    date,
    reviewedBy: "Owner",
    reviewedAt: at(-i * 86400000),
    delivered: 0,
    ready: 0,
    unfinished: 0,
    collected: 0,
    pending: 0,
  }));
  return data;
}
async function seed(data: Workspace) {
  const context = isolatedDatabase();
  await ensureSchema();
  await context.engine.query(
    "UPDATE sg_workspace SET data=$1::jsonb, revision=7 WHERE id=1",
    [JSON.stringify(data)],
  );
  await context.engine.query(
    "INSERT INTO sg_owner(id,name,email,password_hash,salt) VALUES(1,'Owner','owner@example.test','hash','salt')",
  );
  await context.engine.query(
    "INSERT INTO sg_sessions(token_hash,owner_id,expires_at) VALUES($1,1,now()+interval '1 day')",
    [hashToken(token)],
  );
  return context;
}
const request = (path: string, auth = true) =>
  new NextRequest(`http://localhost:3000/api/${path}`, {
    headers: auth ? { Cookie: `swapna_session=${token}` } : {},
  });

test("feature queries page relational tables, preserve JSON rollback semantics, and compute full-shop summaries", async () => {
  const data = fixture(),
    { engine } = await seed(data);
  try {
    const query = ordersQuery.parse({ page: 2 }),
      legacy = await readOrders(query);
    assert.equal(legacy.page.total, 31);
    assert.equal(legacy.data.orders.length, 11);
    const planned = await transitionWorkspaceStorage({
      direction: "cutover",
      dryRun: true,
    });
    await transitionWorkspaceStorage({
      direction: "cutover",
      expectedRevision: planned.revision,
      expectedChecksum: planned.checksum,
      backupReference: "isolated-feature-read-fixture",
    });
    const relational = await readOrders(query);
    assert.deepEqual(relational.data, legacy.data);
    assert.deepEqual(relational.page, legacy.page);
    assert.equal(relational.revision, 8);
    const first = await readOrders(ordersQuery.parse({}));
    assert.equal(first.data.orders.length, 20);
    assert.equal(
      new Set(
        [...first.data.orders, ...relational.data.orders].map((o) => o.id),
      ).size,
      31,
    );
    assert.deepEqual(
      [...first.data.orders, ...relational.data.orders].map((o) => o.id),
      [...data.orders].sort(prioritySort).map((o) => o.id),
    );
    assert.equal(first.data.staff.length, 0);
    assert.equal(first.data.activity.length, 0);
    assert.ok(first.data.customers.length < 31);
    const customers = await readCustomers(directoryQuery.parse({ page: 2 }));
    assert.equal(customers.page.total, 31);
    assert.equal(customers.data.customers.length, 11);
    assert.equal(customers.data.orders.length, 0);
    const directory = await readCustomers(directoryQuery.parse({ q: "%_\\" }));
    assert.equal(directory.page.total, 1);
    assert.equal(directory.orderCounts["customer-0"], 24);
    const history = await readCustomer(
      "customer-0",
      pageQuery.parse({ page: 2 }),
    );
    assert.equal(history.page.total, 24);
    assert.equal(history.data.orders.length, 4);
    assert.equal(history.data.customers[0].measurementHistory, undefined);
    assert.deepEqual(history.data.customers[0].measurements, { Bust: "34" });
    assert.equal(
      (await engine.query("SELECT * FROM sg_measurement_versions")).rows.length,
      1,
    );
    const order = await readOrder("order-0", pageQuery.parse({ page: 2 }));
    assert.equal(order.data.orders.length, 1);
    assert.equal(order.data.activity.length, 7);
    assert.equal(order.page.total, 27);
    assert.equal(order.data.orders[0].payments.length, 4);
    const exact = await readOrders(ordersQuery.parse({ q: "Silk%_\\" }));
    assert.equal(exact.page.total, 1);
    assert.equal(exact.data.orders[0].id, "order-0");
    assert.equal(
      (await readOrders(ordersQuery.parse({ q: "%" }))).page.total,
      24,
    );
    assert.equal(
      (await readOrders(ordersQuery.parse({ q: "does-not-exist" }))).page.total,
      0,
    );
    assert.equal(
      (await readOrders(ordersQuery.parse({ page: 100 }))).data.orders.length,
      0,
    );
    assert.equal((await readSearch({ q: "Blouse" })).data.orders.length, 6);
    assert.equal(
      (await readSearch({ q: data.customers[24].phone })).page.total,
      0,
    );
    assert.equal(
      (await readOrders(ordersQuery.parse({ q: data.customers[24].phone })))
        .page.total,
      1,
    );
    const today = shopDate(),
      open = data.orders.filter(isOpen);
    for (const filter of [
      "active",
      "due",
      "overdue",
      "ready",
      "cancelled",
    ] as const) {
      const expected =
        filter === "active"
          ? open
          : filter === "due"
            ? open.filter((o) => o.dueDate === today)
            : filter === "overdue"
              ? open.filter((o) => o.dueDate < today)
              : data.orders.filter((o) => o.status === filter);
      assert.equal(
        (await readOrders(ordersQuery.parse({ filter }))).page.total,
        expected.length,
      );
    }
    assert.equal(
      (
        await readOrders(
          ordersQuery.parse({ customerId: "customer-0", priority: "urgent" }),
        )
      ).page.total,
      8,
    );
    const dashboard = await readDashboard({ taskFilter: "due" });
    assert.equal(dashboard.data.orders.length, 5);
    assert.equal(dashboard.data.activity.length, 3);
    assert.equal(dashboard.summary.open, 29);
    assert.equal(dashboard.summary.collectedToday, 11000);
    assert.equal(dashboard.summary.deliveredToday, 1);
    assert.equal(dashboard.summary.reviewed, true);
    assert.equal(
      dashboard.summary.due,
      open.filter((o) => o.dueDate === today).length,
    );
    assert.equal(
      dashboard.summary.unfinished,
      open.filter((o) => o.status !== "ready" && o.dueDate <= today).length,
    );
    assert.deepEqual(dashboard.summary.stations, [6, 6, 6, 5, 5]);
    assert.equal(
      (await readDashboard({ taskFilter: "ready" })).data.orders[0].id,
      "order-28",
    );
    assert.ok(
      (await readDashboard({ taskFilter: "urgent" })).data.orders.every(
        (o) => o.priority === "urgent",
      ),
    );
    const workflow = await readWorkflow(
      workflowQuery.parse({ page: 2, pageSize: 2 }),
    );
    assert.equal(workflow.columns.length, 5);
    assert.deepEqual(
      workflow.columns.map((c) => c.page.total),
      [6, 6, 6, 5, 5],
    );
    assert.ok(workflow.columns.every((c) => c.pieces.length === 2));
    assert.ok(
      workflow.columns.every((c) =>
        c.pieces.every((p) => p.item.station === c.station),
      ),
    );
    const station = await readWorkflow(workflowQuery.parse({ station: "4" }));
    assert.equal(station.columns[4].pieces.length, 5);
    assert.equal(station.columns[0].pieces.length, 0);
    assert.equal(station.columns[0].page.total, 6);
    const billing = await readBilling(billingQuery.parse({ page: 2 }));
    assert.equal(billing.page.total, 29);
    assert.equal(billing.data.orders.length, 9);
    assert.equal(
      billing.totals.pending,
      data.orders
        .filter((o) => o.status !== "cancelled")
        .reduce((sum, o) => sum + balance(o), 0),
    );
    assert.equal(
      billing.totals.collected,
      data.orders.reduce((sum, o) => sum + paid(o), 0),
    );
    assert.equal(
      (await readBilling(billingQuery.parse({ filter: "settled" }))).data
        .orders[0].id,
      "order-29",
    );
    assert.deepEqual(await lookupOrder({ code: "sg-1000" }), {
      orderId: "order-0",
    });
    assert.deepEqual(await lookupOrder({ code: "swapna:order-0:piece-0" }), {
      orderId: "order-0",
    });
    assert.deepEqual(await lookupOrder({ code: "order-0" }), {
      orderId: "order-0",
    });
    await assert.rejects(lookupOrder({ code: "%" }), /No order/);
    await assert.rejects(
      readOrder("missing", pageQuery.parse({})),
      /not found/,
    );
    await assert.rejects(
      readCustomer("missing", pageQuery.parse({})),
      /not found/,
    );
    const shell = await readShell();
    assert.equal(shell.openOrders, 29);
    assert.equal(shell.activity.length, 8);
    const team = await readTeam(pageQuery.parse({ page: 2 }));
    assert.equal(team.data.staff.length, 4);
    assert.equal(team.page.total, 24);
    const reports = await readReports(pageQuery.parse({ page: 2 }));
    assert.equal(reports.data.dayReports?.length, 4);
    assert.equal(reports.page.total, 24);
    assert.equal(reports.data.dayReports?.[0].date, data.dayReports?.[20].date);
    const csv = await exportOrderRows(exportQuery.parse({ page: 2 }));
    assert.ok(csv.csv.startsWith("\uFEFF"));
    assert.equal(csv.csv.split("\r\n").length, 32);
    assert.ok(csv.csv.includes('"\'=Percent%_\\ ""Customer"""'));
    assert.ok(csv.csv.includes('"100","10","90"'));
    const billingCsv = await exportOrderRows(
      exportQuery.parse({ scope: "billing", billingFilter: "settled" }),
    );
    assert.equal(billingCsv.csv.split("\r\n").length, 2);
    assert.ok(billingCsv.csv.includes("SG-1029"));
  } finally {
    await engine.close();
  }
});

test("feature GET routes authenticate before validation, bound queries, and keep exports private", async () => {
  const { engine } = await seed(fixture());
  try {
    assert.equal(
      (await ordersGet(request("orders?page=0", false))).status,
      401,
    );
    for (const query of [
      "page=0",
      "page=-1",
      "page=1.5",
      "pageSize=51",
      "pageSize=0",
      "page=x",
      "filter=oops",
      "priority=oops",
      "q=" + "x".repeat(201),
      "page=1&page=2",
    ])
      assert.equal(
        (await ordersGet(request("orders?" + query))).status,
        400,
        query,
      );
    const response = await ordersGet(request("orders?page=2"));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal((await response.json()).data.orders.length, 11);
    assert.equal(
      (
        await customerGet(request("customers/missing"), {
          params: Promise.resolve({ id: "missing" }),
        })
      ).status,
      404,
    );
    assert.equal(
      (await exportGet(request("orders/export", false))).status,
      401,
    );
    const csv = await exportGet(request("orders/export?filter=ready"));
    assert.equal(csv.status, 200);
    assert.equal(csv.headers.get("cache-control"), "no-store");
    assert.ok(csv.headers.get("content-type")?.includes("text/csv"));
    assert.equal((await csv.text()).split("\r\n").length, 2);
  } finally {
    await engine.close();
  }
});
