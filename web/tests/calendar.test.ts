import { test } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { ensureSchema } from "../src/db";
import { isolatedDatabase } from "./helpers/isolated-database";
import {
  emptyWorkspace,
  shopDate,
  type Workspace,
} from "../src/shared/workspace";
import {
  calendarDayQuery,
  calendarMonthQuery,
} from "../src/features/calendar/contracts/query";
import {
  monthGrid,
  shiftMonth,
  selectCalendarDay,
  selectCalendarMonth,
} from "../src/features/calendar/domain/calendar";
import {
  readCalendarDay,
  readCalendarMonth,
} from "../src/services/calendar-read-service";
import { transitionWorkspaceStorage } from "../src/services/storage-migration-service";
import { hashToken } from "../src/shared/server/crypto";
import { GET as monthGet } from "../src/app/api/calendar/route";
import { GET as dayGet } from "../src/app/api/calendar/day/route";

const day = "2026-09-14";
const start = new Date(`${day}T00:00:00+05:30`).getTime();
const at = (offset: number) => new Date(start + offset).toISOString();
const ownerToken = "a".repeat(64);
const workerToken = "b".repeat(64);

function fixture(): Workspace {
  const data = emptyWorkspace();
  data.customers = [
    {
      id: "customer",
      name: "Calendar Customer",
      phone: "9000000000",
      email: "",
      notes: "",
      measurements: {},
    },
  ];
  data.orders = [-1, 0, 86400000 - 1, 86400000].map((time, i) => ({
    id: `order-${i}`,
    number: `SG-${1000 + i}`,
    customerId: "customer",
    priority: "normal",
    dueDate: i === 3 ? "2026-09-15" : day,
    createdAt: at(time),
    deliveredAt: at(time),
    status: "delivered",
    notes: `Order notes ${i}`,
    items: [
      {
        id: `piece-${i}`,
        garment: "Blouse",
        material: "Cotton",
        station: 5,
        price: (i + 1) * 100,
      },
    ],
    payments: [
      {
        id: `payment-${i}`,
        date: at(time),
        amount: (i + 1) * 100,
        method: "UPI",
      },
    ],
  }));
  data.orders.push({
    ...data.orders[0],
    id: "cancelled",
    number: "SG-1004",
    status: "cancelled",
    deliveredAt: undefined,
    createdAt: at(1000),
    items: [{ ...data.orders[0].items[0], id: "cancelled-piece", price: 10000 }],
    payments: [
      { id: "cancelled-payment", date: at(1000), amount: 500, method: "Cash" },
    ],
  });
  data.orders.push({
    ...data.orders[0],
    id: "open",
    number: "SG-1005",
    status: "in_progress",
    deliveredAt: undefined,
    createdAt: "2026-08-31T18:30:00Z",
    items: [{ ...data.orders[0].items[0], id: "open-piece", station: 1 }],
    payments: [],
  });
  data.activity = Array.from({ length: 27 }, (_, i) => ({
    id: `activity-${String(i).padStart(2, "0")}`,
    orderId: "open",
    title: `Station update ${i}`,
    detail: "Cutting completed",
    time: at(2000),
  }));
  data.activity.push(
    {
      id: "before",
      orderId: "open",
      title: "Before midnight",
      detail: "",
      time: at(-1),
    },
    {
      id: "end",
      orderId: "open",
      title: "Before next day",
      detail: "",
      time: at(86400000 - 1),
    },
    {
      id: "after",
      orderId: "open",
      title: "Next day",
      detail: "",
      time: at(86400000),
    },
  );
  return data;
}

test("calendar validates real dates and renders leap months and year transitions independently of local time", () => {
  for (const date of [
    "2026-02-29",
    "2026-09-31",
    "2026-13-01",
    "2026-9-14",
    "2026-09-14T00:00:00Z",
    "0000-01-01",
    "9999-12-31",
  ])
    assert.equal(calendarDayQuery.safeParse({ date }).success, false, date);
  for (const month of ["2026-00", "2026-13", "2026-9", "bad", "0000-01"])
    assert.equal(calendarMonthQuery.safeParse({ month }).success, false, month);
  assert.equal(
    calendarDayQuery.safeParse({ date: day, pageSize: 51 }).success,
    false,
  );
  assert.equal(
    calendarDayQuery.safeParse({ date: day, kind: "unknown" }).success,
    false,
  );
  assert.equal(
    calendarDayQuery.safeParse({ date: day, ownerId: "another" }).success,
    false,
  );
  assert.equal(
    calendarMonthQuery.safeParse({ month: "2026-09", from: "2025-01-01" })
      .success,
    false,
  );
  const grid = monthGrid("2024-02");
  assert.equal(grid.filter(Boolean).length, 29);
  assert.equal(grid[3], "2024-02-01");
  assert.equal(grid.length % 7, 0);
  assert.equal(monthGrid("2026-02").filter(Boolean).length, 28);
  assert.equal(shiftMonth("2026-12", 1), "2027-01");
  assert.equal(shiftMonth("2026-01", -1), "2025-12");
  assert.equal(monthGrid("0001-01").filter(Boolean).length, 31);
});

test("calendar includes all day categories, IST boundaries, cancelled-payment history and stable pages in both storage modes", async () => {
  const { engine } = isolatedDatabase();
  const data = fixture();
  try {
    await ensureSchema();
    await engine.query(
      "UPDATE sg_workspace SET data=$1::jsonb, revision=7 WHERE id=1",
      [JSON.stringify(data)],
    );
    await engine.query(
      "INSERT INTO sg_owner(id,name,email,password_hash,salt) VALUES(1,'Owner','calendar@example.test','hash','salt')",
    );
    await engine.query(
      "INSERT INTO sg_sessions(token_hash,owner_id,expires_at) VALUES($1,1,now()+interval '1 day')",
      [hashToken(ownerToken)],
    );
    await engine.query(
      "INSERT INTO sg_worker_accounts(staff_id,name,email,password_hash,salt,active) VALUES('worker','Worker','calendar-worker@example.test','hash','salt',true)",
    );
    await engine.query(
      "INSERT INTO sg_worker_sessions(token_hash,staff_id,expires_at) VALUES($1,'worker',now()+interval '1 day')",
      [hashToken(workerToken)],
    );
    const input = calendarDayQuery.parse({ date: day });
    const expected = selectCalendarDay(data, input, shopDate(), 7);
    assert.deepEqual(expected.summary.counts, {
      due: 4,
      created: 3,
      delivered: 2,
      payment: 3,
      activity: 28,
    });
    assert.equal(expected.summary.collected, 1000);
    assert.equal(expected.summary.total, 40);
    assert.equal(expected.entries.length, 20);
    assert.deepEqual(await readCalendarDay(input), expected);
    assert.deepEqual(
      await readCalendarMonth({ month: "2026-09" }),
      selectCalendarMonth(data, "2026-09", shopDate(), 7),
    );
    const planned = await transitionWorkspaceStorage({
      direction: "cutover",
      dryRun: true,
    });
    await transitionWorkspaceStorage({
      direction: "cutover",
      expectedRevision: planned.revision,
      expectedChecksum: planned.checksum,
      backupReference: "isolated-calendar-fixture",
    });

    const relational = await readCalendarDay(input);
    assert.deepEqual(relational, { ...expected, revision: 8 });
    const month = await readCalendarMonth({ month: "2026-09" });
    assert.deepEqual(
      month,
      selectCalendarMonth(data, "2026-09", shopDate(), 8),
    );
    assert.equal(
      month.days["2026-09-01"].counts.created,
      1,
      "IST first-of-month includes previous UTC evening",
    );
    assert.equal(
      "entries" in month,
      false,
      "month response contains only aggregates",
    );

    const second = await readCalendarDay({ ...input, page: 2 });
    assert.equal(second.entries.length, 20);
    assert.deepEqual(
      second.summary,
      relational.summary,
      "totals cover the whole date, not only the page",
    );
    assert.equal(
      new Set(
        [...relational.entries, ...second.entries].map((entry) => entry.id),
      ).size,
      40,
    );
    assert.deepEqual(
      second.entries,
      selectCalendarDay(data, { ...input, page: 2 }, shopDate()).entries,
    );
    for (const kind of [
      "due",
      "created",
      "delivered",
      "payment",
      "activity",
    ] as const) {
      const query = { ...input, kind, pageSize: 50 };
      assert.deepEqual(
        await readCalendarDay(query),
        selectCalendarDay(data, query, shopDate(), 8),
      );
    }
    const due = await readCalendarDay({ ...input, kind: "due" });
    assert.ok(!due.entries.some((entry) => entry.orderId === "cancelled"));
    const payments = await readCalendarDay({ ...input, kind: "payment" });
    assert.deepEqual(payments.entries.map((entry) => entry.id).sort(), [
      "payment:cancelled-payment",
      "payment:payment-1",
      "payment:payment-2",
    ]);
    const overdue = selectCalendarDay(
      data,
      { ...input, kind: "due" },
      "2026-09-15",
    );
    assert.deepEqual(
      overdue.entries
        .filter((entry) => entry.overdue)
        .map((entry) => entry.orderId),
      ["open"],
    );
    const empty = await readCalendarDay({ ...input, date: "2026-10-01" });
    assert.equal(empty.summary.total, 0);
    assert.equal(empty.entries.length, 0);
    assert.equal(
      (await readCalendarMonth({ month: "2026-10" })).summary.total,
      0,
    );
    assert.equal(
      (await readCalendarDay({ ...input, page: 99 })).entries.length,
      0,
    );

    const request = (path: string, token?: string) =>
      new NextRequest(`http://localhost:3000/api/${path}`, {
        headers: token ? { Cookie: `swapna_session=${token}` } : {},
      });
    for (const [handler, path] of [
      [monthGet, "calendar?month=2026-09"],
      [dayGet, `calendar/day?date=${day}`],
    ] as const) {
      assert.equal((await handler(request(path))).status, 401);
      assert.equal((await handler(request(path, workerToken))).status, 403);
      const response = await handler(request(path, ownerToken));
      assert.equal(response.status, 200);
      assert.match(response.headers.get("Cache-Control") ?? "", /no-store/);
      assert.equal(
        (await handler(request(`${path}&${path.split("?")[1]}`, ownerToken)))
          .status,
        400,
      );
    }
    for (const path of [
      "calendar/day?date=2026-02-30",
      "calendar/day",
      `calendar/day?date=${day}&pageSize=51`,
    ])
      assert.equal((await dayGet(request(path, ownerToken))).status, 400);
    assert.equal(
      (await monthGet(request("calendar?month=2026-13", ownerToken))).status,
      400,
    );

    const rollback = await transitionWorkspaceStorage({
      direction: "rollback",
      dryRun: true,
    });
    await transitionWorkspaceStorage({
      direction: "rollback",
      expectedRevision: rollback.revision,
      expectedChecksum: rollback.checksum,
      backupReference: "isolated-calendar-fixture",
    });
    assert.deepEqual((await readCalendarDay(input)).entries, expected.entries);
  } finally {
    await engine.close();
  }
});
