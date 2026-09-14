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
import { hashToken } from "../src/shared/server/crypto";
import { transitionWorkspaceStorage } from "../src/services/storage-migration-service";
import {
  readWorkCalendarDay,
  readWorkCalendarMonth,
} from "../src/services/work-calendar-service";
import { workCalendarDayQuery } from "../src/features/team/contracts/work-calendar";
import {
  previewWorkCalendarDay,
  workerDueEntries,
} from "../src/features/team/domain/work-calendar";
import { GET as monthGet } from "../src/app/api/work/calendar/route";
import { GET as dayGet } from "../src/app/api/work/calendar/day/route";
import { GET as ownerMonthGet } from "../src/app/api/calendar/route";

const date = "2024-02-29";
const a = {
  name: "Same Name",
  email: "a@example.test",
  role: "worker" as const,
  staffId: "worker-a",
};
const b = { ...a, email: "b@example.test", staffId: "worker-b" };
const tokens = { owner: "1".repeat(64), a: "2".repeat(64), b: "3".repeat(64) };
function fixture(): Workspace {
  const data = emptyWorkspace();
  data.customers = [
    {
      id: "private-customer",
      name: "Private Customer",
      phone: "9000000000",
      email: "private@example.test",
      notes: "private notes",
      measurements: {},
    },
  ];
  data.staff = [a, b].map((person) => ({
    id: person.staffId,
    name: person.name,
    role: "Worker",
    station: "Measurement",
    color: "sage",
    worker: {
      email: person.email,
      active: true,
      available: true,
      skills: [0, 1, 2, 3, 4],
      capacityMinutes: 480,
      revision: 1,
    },
  }));
  data.orders = Array.from({ length: 30 }, (_, i) => ({
    id: `order-${i}`,
    number: `SG-${1000 + i}`,
    customerId: "private-customer",
    priority: "normal",
    dueDate: i === 28 ? "2024-03-01" : date,
    createdAt: "2024-02-01T00:00:00Z",
    status: i === 26 ? "cancelled" : i === 27 ? "delivered" : "in_progress",
    ...(i === 27 ? { deliveredAt: "2024-02-29T12:00:00Z" } : {}),
    notes: "Private order note",
    items: [
      {
        id: `piece-${String(i).padStart(2, "0")}`,
        garment: "Blouse",
        material: "Cotton",
        price: 120000,
        station: i === 29 || i === 27 ? 5 : 0,
        work: {
          version: 1,
          status: i === 0 ? "in_progress" : i === 1 ? "blocked" : "pending",
          assigneeId:
            i === 27 || i === 29 ? undefined : i === 25 ? b.staffId : a.staffId,
        },
        ...(i === 0
          ? {
              workflow: {
                id: "custom",
                name: "Custom",
                revision: 1,
                position: 0,
                version: 0,
                steps: [{ id: "sleeve", name: "Sleeve cutting", station: 0 }],
              },
            }
          : {}),
      },
    ],
    payments: [
      {
        id: `payment-${i}`,
        date: "2024-02-01T00:00:00Z",
        amount: i === 27 ? 120000 : 40000,
        method: "Cash",
      },
    ],
  }));
  return data;
}

test("worker calendar scopes current assignments and immutable completions, handles IST boundaries, pages across sources and survives rollback", async () => {
  const { engine } = isolatedDatabase();
  const data = fixture();
  const input = workCalendarDayQuery.parse({ date });
  const request = (path: string, token?: string) =>
    new NextRequest(`http://localhost:3000${path}`, {
      headers: token ? { Cookie: `swapna_session=${token}` } : {},
    });
  async function transition(direction: "cutover" | "rollback") {
    const plan = await transitionWorkspaceStorage({ direction, dryRun: true });
    return transitionWorkspaceStorage({
      direction,
      expectedRevision: plan.revision,
      expectedChecksum: plan.checksum,
      backupReference: "isolated-worker-calendar-fixture",
    });
  }
  try {
    await ensureSchema();
    await engine.query(
      "UPDATE sg_workspace SET data=$1::jsonb, revision=7 WHERE id=1",
      [JSON.stringify(data)],
    );
    await engine.query(
      "INSERT INTO sg_owner(id,name,email,password_hash,salt) VALUES(1,'Owner','owner@example.test','hash','salt')",
    );
    await engine.query(
      "INSERT INTO sg_sessions(token_hash,owner_id,expires_at) VALUES($1,1,now()+interval '1 day')",
      [hashToken(tokens.owner)],
    );
    for (const [person, token] of [
      [a, tokens.a],
      [b, tokens.b],
    ] as const) {
      await engine.query(
        "INSERT INTO sg_worker_accounts(staff_id,name,email,password_hash,salt,active) VALUES($1,$2,$3,'hash','salt',true)",
        [person.staffId, person.name, person.email],
      );
      await engine.query(
        "INSERT INTO sg_worker_sessions(token_hash,staff_id,expires_at) VALUES($1,$2,now()+interval '1 day')",
        [hashToken(token), person.staffId],
      );
    }
    const start = new Date(`${date}T00:00:00+05:30`).getTime();
    const completions = [];
    // Historical pieces need not still exist in current orders.
    for (const [i, ms] of [-1, 0, 1000, 86400000 - 1, 86400000].entries()) {
      const id = crypto.randomUUID(),
        mutationId = crypto.randomUUID();
      completions.push(id);
      await engine.query("INSERT INTO sg_mutations(id) VALUES($1)", [
        mutationId,
      ]);
      await engine.query(
        "INSERT INTO sg_work_completions(id,mutation_id,worker_id,order_id,order_number,piece_id,garment,station,step_name,completed_at) VALUES($1,$2,$3,'old-order','SG-OLD',$4,'Gown',3,'Hand embroidery',$5)",
        [
          id,
          mutationId,
          a.staffId,
          `old-piece-${i}`,
          new Date(start + ms).toISOString(),
        ],
      );
    }
    const otherId = crypto.randomUUID();
    await engine.query("INSERT INTO sg_mutations(id) VALUES($1)", [otherId]);
    await engine.query(
      "INSERT INTO sg_work_completions(id,mutation_id,worker_id,order_id,order_number,piece_id,garment,station,step_name,completed_at) VALUES($1,$1,$2,'other-order','SG-OTHER','other-piece','Private garment',0,'Other worker step',$3)",
      [otherId, b.staffId, new Date(start).toISOString()],
    );

    const preview = previewWorkCalendarDay(data, a.staffId, input, shopDate());
    assert.equal(preview.summary.counts.due, 25);
    assert.equal(preview.entries[0].stepName, "Sleeve cutting");
    assert.equal(
      workerDueEntries(data, undefined, date, "2024-03-01", shopDate()).length,
      0,
    );
    const legacy = await readWorkCalendarDay(input, a);
    assert.deepEqual(legacy.entries, preview.entries);
    assert.deepEqual(legacy.summary, {
      counts: { due: 25, completed: 3 },
      total: 28,
      overdue: 25,
      inProgress: 1,
    });
    await transition("cutover");
    const relational = await readWorkCalendarDay(input, a);
    assert.deepEqual(relational, { ...legacy, revision: 8 });
    const second = await readWorkCalendarDay({ ...input, page: 2 }, a);
    assert.equal(second.entries.length, 8);
    assert.deepEqual(
      second.entries.slice(5).map((e) => e.id),
      [completions[3], completions[2], completions[1]],
    );
    assert.equal(
      new Set([...relational.entries, ...second.entries].map((e) => e.id)).size,
      28,
    );
    assert.deepEqual(second.summary, relational.summary);
    assert.equal(
      (await readWorkCalendarDay({ ...input, page: 99 }, a)).entries.length,
      0,
    );
    const completed = await readWorkCalendarDay(
      { ...input, kind: "completed", pageSize: 2, page: 2 },
      a,
    );
    assert.deepEqual(
      completed.entries.map((e) => e.id),
      [completions[1]],
    );
    const due = await readWorkCalendarDay(
      { ...input, kind: "due", pageSize: 50 },
      a,
    );
    assert.equal(due.entries.length, 25);
    assert.ok(due.entries.every((e) => e.kind === "due"));
    const month = await readWorkCalendarMonth({ month: "2024-02" }, a);
    assert.deepEqual(month.days[date], relational.summary);
    assert.equal(month.summary.counts.completed, 4);
    assert.equal(month.days["2024-02-28"].counts.completed, 1);
    assert.equal("entries" in month, false);
    const nextMonth = await readWorkCalendarMonth({ month: "2024-03" }, a);
    assert.deepEqual(nextMonth.summary.counts, { due: 1, completed: 1 });
    const other = await readWorkCalendarDay(input, b);
    assert.deepEqual(other.summary.counts, { due: 1, completed: 1 });
    assert.deepEqual(
      other.entries.map((e) => e.id),
      ["due:piece-25", otherId],
    );
    const serialized = JSON.stringify({ month, relational, second });
    for (const privateValue of [
      "Private Customer",
      "private@example.test",
      "9000000000",
      "Private order note",
      "120000",
      "40000",
      "payments",
      "measurements",
      "SG-OTHER",
      "Other worker step",
      b.staffId,
    ])
      assert.ok(!serialized.includes(privateValue), privateValue);

    for (const [handler, path] of [
      [monthGet, "/api/work/calendar?month=2024-02"],
      [dayGet, `/api/work/calendar/day?date=${date}`],
    ] as const) {
      assert.equal((await handler(request(path))).status, 401);
      assert.equal((await handler(request(path, tokens.owner))).status, 403);
      const response = await handler(request(path, tokens.a));
      assert.equal(response.status, 200);
      assert.match(response.headers.get("Cache-Control") ?? "", /no-store/);
      assert.equal(
        (await handler(request(`${path}&staffId=worker-b`, tokens.a))).status,
        400,
      );
    }
    for (const query of [
      "date=2024-02-30",
      `date=${date}&pageSize=51`,
      `date=${date}&kind=payment`,
      `date=${date}&date=${date}`,
      `date=${date}&page=0`,
    ])
      assert.equal(
        (await dayGet(request(`/api/work/calendar/day?${query}`, tokens.a)))
          .status,
        400,
      );
    assert.equal(
      (await ownerMonthGet(request("/api/calendar?month=2024-02", tokens.a)))
        .status,
      403,
    );
    assert.throws(
      () => readWorkCalendarDay(input, { ...a, staffId: undefined }),
      /worker account/,
    );

    await engine.query(
      "UPDATE sg_order_items SET work=jsonb_set(work,'{assigneeId}','\"worker-b\"'::jsonb) WHERE id='piece-00'",
    );
    const reassigned = await readWorkCalendarDay(input, a);
    assert.deepEqual(reassigned.summary.counts, { due: 24, completed: 3 });
    await transition("rollback");
    assert.deepEqual(
      (await readWorkCalendarDay(input, a)).summary,
      reassigned.summary,
    );
    assert.deepEqual(
      (
        await readWorkCalendarDay(
          { ...input, kind: "completed", pageSize: 50 },
          a,
        )
      ).entries.map((e) => e.id),
      [completions[3], completions[2], completions[1]],
    );
    await engine.query(
      "UPDATE sg_worker_accounts SET active=false WHERE staff_id=$1",
      [a.staffId],
    );
    assert.equal(
      (await monthGet(request("/api/work/calendar?month=2024-02", tokens.a)))
        .status,
      401,
    );
  } finally {
    await engine.close();
  }
});
