import { test, after } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { NextRequest } from "next/server";
import type { Pool } from "pg";
import { applyMutation } from "../src/lib/workspace-mutations";
import {
  createPreviewWorkspace,
  emptyWorkspace,
  shopDate,
  type Workspace,
} from "../src/lib/workspace";
import { GET, POST } from "../src/app/api/workspace/route";
import {
  POST as authenticate,
  DELETE as signOut,
} from "../src/app/api/auth/route";

// Actual PostgreSQL WASM engine for SQL/transaction checks. No Railway data is used.
const pg = new PGlite();
async function query(sql: string, values?: unknown[]) {
  const result = values
    ? await pg.query(sql, values)
    : (await pg.exec(sql)).at(-1)!;
  return {
    rows: result.rows,
    rowCount: result.affectedRows || result.rows.length,
  };
}
const adapter = {
  query,
  connect: async () => ({ query, release() {} }),
  on() {},
};
(globalThis as unknown as { swapnaPool: Pool }).swapnaPool =
  adapter as unknown as Pool;
process.env.DATABASE_URL = "postgresql://test.invalid/isolated-test";
process.env.SETUP_TOKEN = "isolated-test-setup-token-do-not-use-in-production";
process.env.APP_ORIGIN = "http://localhost:3000";
after(async () => {
  await pg.close();
});

test("stale station updates are rejected and earlier measurements are preserved", () => {
  const before = createPreviewWorkspace();
  const order = before.orders[0];
  const item = order.items[0];
  const updated = applyMutation(
    before,
    {
      type: "piece.advance",
      orderId: order.id,
      pieceId: item.id,
      expectedStation: item.station,
    },
    "Owner",
  );
  assert.equal(before.orders[0].items[0].station, 3);
  assert.equal(updated.data.orders[0].items[0].station, 4);
  assert.throws(
    () =>
      applyMutation(
        updated.data,
        {
          type: "piece.advance",
          orderId: order.id,
          pieceId: item.id,
          expectedStation: 3,
        },
        "Owner",
      ),
    /progress has changed/,
  );
  const customer = before.customers[0];
  const measured = applyMutation(
    before,
    {
      type: "customer.save",
      customer: {
        ...customer,
        measurements: { ...customer.measurements, Bust: "38" },
      },
    },
    "Owner",
  );
  assert.equal(
    measured.data.customers[0].measurementHistory?.[0].values.Bust,
    "36",
  );
  assert.equal(measured.data.customers[0].measurements.Bust, "38");
  assert.throws(
    () =>
      applyMutation(
        before,
        { type: "order.deliver", orderId: order.id },
        "Owner",
      ),
    /Finish every garment/,
  );
  assert.throws(() =>
    applyMutation(
      before,
      { type: "payment.record", orderId: order.id, amount: -1, method: "Cash" },
      "Owner",
    ),
  );
  assert.throws(
    () =>
      applyMutation(
        emptyWorkspace(),
        {
          type: "order.create",
          customerId: "missing",
          items: [{ garment: "Blouse", material: "", price: 10000 }],
          advance: 0,
          method: "Cash",
          dueDate: shopDate(),
          notes: "",
          priority: "normal",
        },
        "Owner",
      ),
    /existing customer/,
  );
});

test("protected PostgreSQL lifecycle: setup, intake, retries, payment, delivery, report, logout", async () => {
  function request(
    path: string,
    method = "GET",
    body?: unknown,
    cookie?: string,
    origin = "http://localhost:3000",
  ) {
    return new NextRequest(`http://localhost:3000${path}`, {
      method,
      headers: {
        Origin: origin,
        "Content-Type": "application/json",
        ...(cookie ? { Cookie: cookie } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  }
  const unsigned = await GET(request("/api/workspace"));
  assert.equal(unsigned.status, 401);
  assert.equal((await unsigned.json()).setupRequired, true);
  const blocked = await POST(
    request("/api/workspace", "POST", {
      mutationId: crypto.randomUUID(),
      action: {},
    }),
  );
  assert.equal(blocked.status, 401);
  const badSetup = await authenticate(
    request("/api/auth", "POST", {
      action: "setup",
      name: "Test Owner",
      email: "owner@example.test",
      password: "isolated-test-password",
      setupToken: "wrong-token",
    }),
  );
  assert.equal(badSetup.status, 403);
  const setup = await authenticate(
    request("/api/auth", "POST", {
      action: "setup",
      name: "Test Owner",
      email: "owner@example.test",
      password: "isolated-test-password",
      setupToken: process.env.SETUP_TOKEN,
    }),
  );
  assert.equal(setup.status, 200, JSON.stringify(await setup.clone().json()));
  const cookie = setup.headers.get("set-cookie")!.split(";")[0];
  assert.match(setup.headers.get("set-cookie")!, /HttpOnly/i);
  const rows = await pg.query<{ password_hash: string }>(
    "SELECT password_hash FROM sg_owner",
  );
  assert.notEqual(rows.rows[0].password_hash, "isolated-test-password");
  const storedToken = await pg.query<{ token_hash: string }>(
    "SELECT token_hash FROM sg_sessions",
  );
  assert.notEqual(storedToken.rows[0].token_hash, cookie.split("=")[1]);
  const crossSite = await POST(
    request("/api/workspace", "POST", {}, cookie, "https://untrusted.example"),
  );
  assert.equal(crossSite.status, 403);
  async function mutate(action: unknown, mutationId = crypto.randomUUID()) {
    const response = await POST(
      request("/api/workspace", "POST", { mutationId, action }, cookie),
    );
    return {
      status: response.status,
      body: (await response.json()) as {
        data: Workspace;
        resultId: string;
        revision: number;
        error?: string;
      },
    };
  }
  const customerId = crypto.randomUUID();
  const customer = await mutate({
    type: "customer.save",
    customer: {
      id: customerId,
      name: "O'Neil; DROP TABLE sg_owner;",
      phone: "9000000099",
      email: "",
      notes: "Test only",
      measurements: { Bust: "36" },
    },
  });
  assert.equal(customer.status, 200);
  const orderCommand = {
    type: "order.create",
    customerId,
    items: [{ garment: "Blouse", price: 150000, material: "Silk" }],
    advance: 50000,
    method: "Cash",
    dueDate: shopDate(),
    notes: "Test order",
    priority: "urgent",
  };
  const commandId = crypto.randomUUID();
  const created = await mutate(orderCommand, commandId);
  assert.equal(created.status, 200);
  const repeated = await mutate(orderCommand, commandId);
  assert.equal(repeated.body.data.orders.length, 1);
  assert.equal(repeated.body.resultId, created.body.resultId);
  assert.equal(repeated.body.revision, created.body.revision);
  const orderId = created.body.resultId;
  const pieceId = created.body.data.orders[0].items[0].id;
  const overpayment = await mutate({
    type: "payment.record",
    orderId,
    amount: 100001,
    method: "UPI",
  });
  assert.equal(overpayment.status, 409);
  for (let index = 0; index < 5; index++) {
    const progress = await mutate({
      type: "piece.advance",
      orderId,
      pieceId,
      expectedStation: index,
    });
    assert.equal(progress.status, 200);
  }
  const earlyDelivery = await mutate({ type: "order.deliver", orderId });
  assert.equal(earlyDelivery.status, 409);
  const paymentId = crypto.randomUUID();
  const paymentCommand = {
    type: "payment.record",
    orderId,
    amount: 100000,
    method: "UPI",
  };
  const payment = await mutate(paymentCommand, paymentId);
  assert.equal(payment.status, 200);
  const paymentRetry = await mutate(paymentCommand, paymentId);
  assert.equal(paymentRetry.body.data.orders[0].payments.length, 2);
  const delivered = await mutate({ type: "order.deliver", orderId });
  assert.equal(delivered.body.data.orders[0].status, "delivered");
  const closed = await mutate({ type: "day.close", date: shopDate() });
  assert.equal(closed.body.data.dayReports?.[0].collected, 150000);
  assert.equal(closed.body.data.dayReports?.[0].delivered, 1);
  const duplicateClose = await mutate({ type: "day.close", date: shopDate() });
  assert.equal(duplicateClose.status, 409);
  const afterReload = await GET(
    request("/api/workspace", "GET", undefined, cookie),
  );
  const saved = await afterReload.json();
  assert.equal(saved.data.orders[0].status, "delivered");
  assert.equal(saved.data.activity[0].actor, "Test Owner");
  const loggedOut = await signOut(
    request("/api/auth", "DELETE", undefined, cookie),
  );
  assert.equal(loggedOut.status, 200);
  const revoked = await GET(
    request("/api/workspace", "GET", undefined, cookie),
  );
  assert.equal(revoked.status, 401);
  const wrongPassword = await authenticate(
    request("/api/auth", "POST", {
      action: "signin",
      email: "owner@example.test",
      password: "a-wrong-test-password",
    }),
  );
  assert.equal(wrongPassword.status, 401);
  const login = await authenticate(
    request("/api/auth", "POST", {
      action: "signin",
      email: "owner@example.test",
      password: "isolated-test-password",
    }),
  );
  assert.equal(login.status, 200);
});
