import "server-only";
import { and, asc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { orders, customers, orderItems, payments, activity } from "@/db/schema";
import type { PageQuery } from "@/shared/contracts/query-input";
import type { OrdersQuery } from "@/features/orders/contracts/query";
import type { BillingQuery } from "@/features/billing/contracts/query";
import type { OrderRead } from "@/features/orders/types/queries";
import type { BillingRead } from "@/features/billing/types/queries";
import { WorkspaceError } from "@/shared/errors";
import {
  balance,
  paid,
  total,
  isOpen,
  prioritySort,
  STATUS_LABEL,
  type Workspace,
} from "@/shared/workspace";
import {
  withRead,
  literalPattern,
  openOrder,
  orderSorting,
  countRows,
  hydrateOrders,
  pageInfo,
  offset,
  slicePage,
  legacyOrders,
  readActivity,
  type ReadContext,
} from "./read-context";

export function orderWhere(
  input: OrdersQuery,
  today: string,
  globalSearch = false,
): SQL | undefined {
  const conditions: SQL[] = [];
  if (input.q) {
    const pattern = literalPattern(input.q);
    conditions.push(
      or(
        ilike(orders.number, pattern),
        sql`exists (select 1 from ${customers} where ${customers.id} = ${orders.customerId} and (${customers.name} ilike ${pattern} ${globalSearch ? sql`` : sql`or ${customers.phone} ilike ${pattern}`}))`,
        sql`exists (select 1 from ${orderItems} where ${orderItems.orderId} = ${orders.id} and ${orderItems.garment} ilike ${pattern})`,
      )!,
    );
  }
  if (input.customerId)
    conditions.push(eq(orders.customerId, input.customerId));
  if (input.priority !== "all")
    conditions.push(eq(orders.priority, input.priority));
  if (input.filter === "active") conditions.push(openOrder);
  else if (input.filter === "due")
    conditions.push(openOrder, eq(orders.dueDate, today));
  else if (input.filter === "overdue")
    conditions.push(openOrder, sql`${orders.dueDate} < ${today}::date`);
  else if (input.filter !== "all")
    conditions.push(eq(orders.status, input.filter));
  return and(...conditions);
}
export function filterLegacyOrders(
  data: Workspace,
  input: OrdersQuery,
  today: string,
  globalSearch = false,
) {
  const q = input.q.toLowerCase();
  return data.orders
    .filter((o) => {
      const customer = data.customers.find((c) => c.id === o.customerId);
      return (
        (!q ||
          `${o.number} ${customer?.name ?? ""} ${globalSearch ? "" : (customer?.phone ?? "")} ${o.items.map((i) => i.garment).join(" ")}`
            .toLowerCase()
            .includes(q)) &&
        (!input.customerId || input.customerId === o.customerId) &&
        (input.priority === "all" || input.priority === o.priority) &&
        (input.filter === "all" ||
          (input.filter === "active"
            ? isOpen(o)
            : input.filter === "due"
              ? isOpen(o) && o.dueDate === today
              : input.filter === "overdue"
                ? isOpen(o) && o.dueDate < today
                : o.status === input.filter))
      );
    })
    .sort(prioritySort);
}
export async function orderPage(
  context: ReadContext,
  input: OrdersQuery,
  globalSearch = false,
): Promise<OrderRead> {
  const { tx, revision, today, legacy } = context;
  if (legacy) {
    const rows = filterLegacyOrders(legacy, input, today, globalSearch);
    return {
      revision,
      data: legacyOrders(legacy, slicePage(rows, input)),
      page: pageInfo(input, rows.length),
    };
  }
  const where = orderWhere(input, today, globalSearch);
  const count = await countRows(tx, orders, where);
  const rows = await tx
    .select()
    .from(orders)
    .where(where)
    .orderBy(...orderSorting)
    .limit(input.pageSize)
    .offset(offset(input));
  return {
    revision,
    data: await hydrateOrders(tx, rows),
    page: pageInfo(input, count),
  };
}
export const readOrders = (input: OrdersQuery) =>
  withRead((context) => orderPage(context, input));
export const readSearch = (input: { q: string }) =>
  withRead((context) =>
    orderPage(
      context,
      { q: input.q, filter: "all", priority: "all", page: 1, pageSize: 6 },
      true,
    ),
  );
export const readOrder = (id: string, input: PageQuery) =>
  withRead(async ({ tx, revision, legacy }): Promise<OrderRead> => {
    if (legacy) {
      const order = legacy.orders.find((o) => o.id === id);
      if (!order) throw new WorkspaceError("Order not found.", 404);
      const rows = legacy.activity.filter((a) => a.orderId === id),
        data = legacyOrders(legacy, [order]);
      data.activity = slicePage(rows, input);
      return { revision, data, page: pageInfo(input, rows.length) };
    }
    const rows = await tx
      .select()
      .from(orders)
      .where(eq(orders.id, id))
      .limit(1);
    if (!rows.length) throw new WorkspaceError("Order not found.", 404);
    const data = await hydrateOrders(tx, rows);
    const count = await countRows(tx, activity, eq(activity.orderId, id));
    data.activity = await readActivity(tx, input.pageSize, offset(input), id);
    return { revision, data, page: pageInfo(input, count) };
  });
export const orderBalance = sql`(coalesce((select sum(${orderItems.price}) from ${orderItems} where ${orderItems.orderId}=${orders.id}),0) - coalesce((select sum(${payments.amount}) from ${payments} where ${payments.orderId}=${orders.id}),0))`;
export const billingWhere = (filter: BillingQuery["filter"]) =>
  and(
    sql`${orders.status} <> 'cancelled'`,
    filter === "all"
      ? undefined
      : filter === "pending"
        ? sql`${orderBalance} > 0`
        : sql`${orderBalance} <= 0`,
  );
export const billingLegacy = (
  data: Workspace,
  filter: BillingQuery["filter"],
) =>
  data.orders.filter(
    (o) =>
      o.status !== "cancelled" &&
      (filter === "all" ||
        (filter === "pending" ? balance(o) > 0 : balance(o) <= 0)),
  );
export const readBilling = (input: BillingQuery) =>
  withRead(async (context): Promise<BillingRead> => {
    const { tx, revision, legacy } = context;
    if (legacy) {
      const rows = billingLegacy(legacy, input.filter);
      return {
        revision,
        data: legacyOrders(legacy, slicePage(rows, input)),
        page: pageInfo(input, rows.length),
        totals: {
          pending: legacy.orders
            .filter((o) => o.status !== "cancelled")
            .reduce((sum, o) => sum + balance(o), 0),
          collected: legacy.orders.reduce((sum, o) => sum + paid(o), 0),
        },
      };
    }
    const where = billingWhere(input.filter),
      count = await countRows(tx, orders, where);
    const rows = await tx
      .select()
      .from(orders)
      .where(where)
      .orderBy(asc(orders.position), asc(orders.id))
      .limit(input.pageSize)
      .offset(offset(input));
    const [pending] = await tx
      .select({ value: sql<string>`coalesce(sum(${orderBalance}),0)` })
      .from(orders)
      .where(sql`${orders.status} <> 'cancelled'`);
    const [collected] = await tx
      .select({ value: sql<string>`coalesce(sum(${payments.amount}),0)` })
      .from(payments);
    return {
      revision,
      data: await hydrateOrders(tx, rows),
      page: pageInfo(input, count),
      totals: {
        pending: Number(pending.value),
        collected: Number(collected.value),
      },
    };
  });
export const lookupOrder = ({ code }: { code: string }) =>
  withRead(async ({ tx, legacy }) => {
    const key = code.startsWith("swapna:") ? code.split(":")[1] : code;
    const order = legacy
      ? legacy.orders.find(
          (o) => o.id === key || o.number.toLowerCase() === key.toLowerCase(),
        )
      : (
          await tx
            .select({ id: orders.id })
            .from(orders)
            .where(
              or(
                eq(orders.id, key),
                sql`lower(${orders.number}) = ${key.toLowerCase()}`,
              ),
            )
            .limit(1)
        )[0];
    if (!order) throw new WorkspaceError("No order matches this code.", 404);
    return { orderId: order.id };
  });
/** All matching rows are exported, independently of the visible page. Hydration is bounded per batch. */
export const exportOrderRows = (
  input: OrdersQuery & {
    scope: "orders" | "billing";
    billingFilter: BillingQuery["filter"];
  },
) =>
  withRead(async (context) => {
    const { tx, legacy, today } = context;
    const escapeCell = (value: string) =>
      `"${(/^[=+@\-\t\r]/.test(value) ? "'" + value : value).replaceAll('"', '""')}"`;
    const row = (values: string[]) => values.map(escapeCell).join(",");
    const lines = [
      row([
        "Order",
        "Customer",
        "Garments",
        "Due date",
        "Status",
        "Priority",
        "Total INR",
        "Paid INR",
        "Balance INR",
      ]),
    ];
    function append(data: Workspace) {
      for (const o of data.orders)
        lines.push(
          row([
            o.number,
            data.customers.find((c) => c.id === o.customerId)?.name ?? "",
            o.items.map((i) => i.garment).join(", "),
            o.dueDate,
            STATUS_LABEL[o.status],
            o.priority,
            String(total(o) / 100),
            String(paid(o) / 100),
            String(balance(o) / 100),
          ]),
        );
    }
    if (legacy)
      append(
        legacyOrders(
          legacy,
          input.scope === "billing"
            ? billingLegacy(legacy, input.billingFilter)
            : filterLegacyOrders(legacy, input, today),
        ),
      );
    else {
      const where =
        input.scope === "billing"
          ? billingWhere(input.billingFilter)
          : orderWhere(input, today);
      for (let skip = 0; ; skip += 200) {
        const rows = await tx
          .select()
          .from(orders)
          .where(where)
          .orderBy(
            ...(input.scope === "billing"
              ? [asc(orders.position), asc(orders.id)]
              : orderSorting),
          )
          .limit(200)
          .offset(skip);
        append(await hydrateOrders(tx, rows));
        if (rows.length < 200) break;
      }
    }
    return {
      csv: "\uFEFF" + lines.join("\r\n"),
      filename: `swapna-orders-${today}.csv`,
    };
  });
