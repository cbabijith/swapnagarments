import "server-only";
import { asc, eq, inArray, sql, type SQL } from "drizzle-orm";
import { db, ensureSchema, type DatabaseTransaction } from "@/db";
import {
  workspaces,
  customers,
  orders,
  orderItems,
  payments,
  activity,
} from "@/db/schema";
import { iso } from "@/db/workspace-validation";
import {
  emptyWorkspace,
  shopDate,
  type Workspace,
  type Customer,
  type Order,
  type Activity,
} from "@/shared/workspace";
import type { PageInfo } from "@/shared/contracts/query";
import type { PageQuery } from "@/shared/contracts/query-input";

export type ReadContext = {
  tx: DatabaseTransaction;
  revision: number;
  today: string;
  legacy?: Workspace;
};
/** Lock only metadata: domain reads share one revision without retrieving the frozen JSON. */
export async function withRead<T>(
  read: (context: ReadContext) => Promise<T>,
): Promise<T> {
  await ensureSchema();
  return db().transaction(async (tx) => {
    const [header] = await tx
      .select({
        revision: workspaces.revision,
        storageModel: workspaces.storageModel,
      })
      .from(workspaces)
      .where(eq(workspaces.id, 1))
      .for("share");
    if (!header) throw new Error("Workspace missing after migration.");
    let legacy: Workspace | undefined;
    if (header.storageModel === "json") {
      const [row] = await tx
        .select({ data: workspaces.data })
        .from(workspaces)
        .where(eq(workspaces.id, 1));
      legacy = row.data;
    }
    return read({ tx, revision: header.revision, today: shopDate(), legacy });
  });
}
export const pageInfo = (input: PageQuery, total: number): PageInfo => ({
  page: input.page,
  pageSize: input.pageSize,
  total,
  pageCount: Math.ceil(total / input.pageSize),
});
export const offset = (input: PageQuery) => (input.page - 1) * input.pageSize;
export const slicePage = <T>(rows: T[], input: PageQuery) =>
  rows.slice(offset(input), offset(input) + input.pageSize);
export const literalPattern = (text: string) =>
  `%${text.replace(/[\\%_]/g, "\\$&")}%`;
export const openOrder = sql`${orders.status} NOT IN ('delivered', 'cancelled')`;
export const orderSorting = [
  sql`CASE ${orders.priority} WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 ELSE 2 END`,
  asc(orders.dueDate),
  asc(orders.position),
  asc(orders.id),
];
export async function countRows(
  tx: DatabaseTransaction,
  table: typeof orders | typeof customers | typeof activity,
  where?: SQL,
) {
  const [row] = await tx
    .select({ total: sql<number>`count(*)::int` })
    .from(table)
    .where(where);
  return Number(row.total);
}
/** Current screens display current measurements; historical versions remain server-side. */
export function hydrateCustomers(
  rows: (typeof customers.$inferSelect)[],
): Customer[] {
  return rows.map((c) => ({
    id: c.id,
    name: c.name,
    phone: c.phone,
    email: c.email,
    notes: c.notes,
    measurements: c.measurements,
    ...(c.hasProfiles ? { profiles: [] } : {}),
  }));
}
export async function hydrateOrders(
  tx: DatabaseTransaction,
  rows: (typeof orders.$inferSelect)[],
): Promise<Workspace> {
  const data = emptyWorkspace();
  if (!rows.length) return data;
  const ids = rows.map((o) => o.id);
  const items = await tx
    .select()
    .from(orderItems)
    .where(inArray(orderItems.orderId, ids))
    .orderBy(asc(orderItems.position), asc(orderItems.id));
  const paymentRows = await tx
    .select()
    .from(payments)
    .where(inArray(payments.orderId, ids))
    .orderBy(asc(payments.position), asc(payments.id));
  const customerRows = await tx
    .select()
    .from(customers)
    .where(inArray(customers.id, [...new Set(rows.map((o) => o.customerId))]))
    .orderBy(asc(customers.position));
  data.customers = hydrateCustomers(customerRows);
  data.orders = rows.map((o): Order => ({
    id: o.id,
    number: o.number,
    customerId: o.customerId,
    priority: o.priority,
    dueDate: o.dueDate,
    createdAt: iso(o.createdAt),
    status: o.status,
    notes: o.notes,
    ...(o.deliveredAt ? { deliveredAt: iso(o.deliveredAt) } : {}),
    items: items
      .filter((i) => i.orderId === o.id)
      .map((i) => ({
        id: i.id,
        ...(i.work ? { work: i.work } : {}),
        ...(i.workflow ? { workflow: i.workflow } : {}),
        garment: i.garment,
        material: i.material,
        station: i.station,
        price: i.price,
        ...(i.measurement ? { measurement: i.measurement } : {}),
        ...(i.design ? { design: i.design } : {}),
        ...(i.measurementHistory
          ? { measurementHistory: i.measurementHistory }
          : {}),
      })),
    payments: paymentRows
      .filter((p) => p.orderId === o.id)
      .map((p) => ({
        id: p.id,
        amount: p.amount,
        method: p.method,
        date: iso(p.paidAt),
      })),
  }));
  return data;
}
export const mapActivity = (a: typeof activity.$inferSelect): Activity => ({
  id: a.id,
  orderId: a.orderId,
  title: a.title,
  detail: a.detail,
  time: iso(a.time),
  ...(a.actor !== null ? { actor: a.actor } : {}),
});
export async function readActivity(
  tx: DatabaseTransaction,
  limit: number,
  skip = 0,
  orderId?: string,
) {
  return (
    await tx
      .select()
      .from(activity)
      .where(orderId ? eq(activity.orderId, orderId) : undefined)
      .orderBy(asc(activity.position), asc(activity.id))
      .limit(limit)
      .offset(skip)
  ).map(mapActivity);
}
export function legacyOrders(data: Workspace, selected: Order[]): Workspace {
  const ids = new Set(selected.map((o) => o.customerId));
  return {
    ...emptyWorkspace(),
    orders: selected,
    customers: data.customers
      .filter((c) => ids.has(c.id))
      .map(({ measurementHistory: _history, ...customer }) => {
        void _history;
        return customer;
      }),
  };
}
