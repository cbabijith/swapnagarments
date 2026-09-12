import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { orders, payments, orderItems, closedDays } from "@/db/schema";
import type { DashboardRead } from "@/features/dashboard/types/queries";
import { isOpen, prioritySort, shopDate } from "@/shared/workspace";
import {
  withRead,
  openOrder,
  orderSorting,
  hydrateOrders,
  pageInfo,
  legacyOrders,
  readActivity,
} from "./read-context";

export const readDashboard = (input: {
  taskFilter: "due" | "urgent" | "ready";
}) =>
  withRead(async ({ tx, revision, today, legacy }): Promise<DashboardRead> => {
    if (legacy) {
      const open = legacy.orders.filter(isOpen),
        due = open.filter((o) => o.dueDate === today),
        ready = open.filter((o) => o.status === "ready"),
        todayOrders = legacy.orders.filter(
          (o) => o.dueDate === today && o.status !== "cancelled",
        );
      const tasks = (
        input.taskFilter === "ready"
          ? ready
          : input.taskFilter === "urgent"
            ? open.filter((o) => o.priority === "urgent")
            : open.filter((o) => o.dueDate <= today)
      ).sort(prioritySort);
      const data = legacyOrders(legacy, tasks.slice(0, 5));
      data.activity = legacy.activity.slice(0, 3);
      data.closedDays = legacy.closedDays.includes(today) ? [today] : [];
      return {
        revision,
        today,
        data,
        page: pageInfo({ page: 1, pageSize: 5 }, tasks.length),
        summary: {
          open: open.length,
          due: due.length,
          overdue: open.filter((o) => o.dueDate < today).length,
          inProgress: open.filter((o) => o.status === "in_progress").length,
          ready: ready.length,
          collectedToday: legacy.orders
            .flatMap((o) => o.payments)
            .filter((p) => shopDate(new Date(p.date)) === today)
            .reduce((sum, p) => sum + p.amount, 0),
          deliveredToday: legacy.orders.filter(
            (o) => o.deliveredAt && shopDate(new Date(o.deliveredAt)) === today,
          ).length,
          unfinished: open.filter(
            (o) => o.status !== "ready" && o.dueDate <= today,
          ).length,
          todayTotal: todayOrders.length,
          todayFinished: todayOrders.filter(
            (o) => o.status === "ready" || o.status === "delivered",
          ).length,
          reviewed: data.closedDays.length > 0,
          stations: Array.from(
            { length: 5 },
            (_, station) =>
              open.flatMap((o) => o.items).filter((i) => i.station === station)
                .length,
          ),
        },
      };
    }
    // Comparing timestamp ranges respects the shop calendar without relying on the connection timezone.
    const start = `${today}T00:00:00+05:30`,
      end = new Date(new Date(start).getTime() + 86400000).toISOString();
    const inDay = (
      column: typeof orders.deliveredAt | typeof payments.paidAt,
    ) =>
      sql`${column} >= ${start}::timestamptz and ${column} < ${end}::timestamptz`;
    const tasks = and(
      openOrder,
      input.taskFilter === "ready"
        ? eq(orders.status, "ready")
        : input.taskFilter === "urgent"
          ? eq(orders.priority, "urgent")
          : sql`${orders.dueDate} <= ${today}::date`,
    );
    const [summary] = await tx
      .select({
        open: sql<number>`count(*) filter (where ${openOrder})::int`,
        due: sql<number>`count(*) filter (where ${openOrder} and ${orders.dueDate}=${today}::date)::int`,
        overdue: sql<number>`count(*) filter (where ${openOrder} and ${orders.dueDate}<${today}::date)::int`,
        inProgress: sql<number>`count(*) filter (where ${orders.status}='in_progress')::int`,
        ready: sql<number>`count(*) filter (where ${orders.status}='ready')::int`,
        deliveredToday: sql<number>`count(*) filter (where ${inDay(orders.deliveredAt)})::int`,
        unfinished: sql<number>`count(*) filter (where ${openOrder} and ${orders.status}<>'ready' and ${orders.dueDate}<=${today}::date)::int`,
        todayTotal: sql<number>`count(*) filter (where ${orders.dueDate}=${today}::date and ${orders.status}<>'cancelled')::int`,
        todayFinished: sql<number>`count(*) filter (where ${orders.dueDate}=${today}::date and ${orders.status} in ('ready','delivered'))::int`,
        taskCount: sql<number>`count(*) filter (where ${tasks})::int`,
      })
      .from(orders);
    const [collected] = await tx
      .select({ value: sql<string>`coalesce(sum(${payments.amount}),0)` })
      .from(payments)
      .where(inDay(payments.paidAt));
    const stationRows = await tx
      .select({
        station: orderItems.station,
        total: sql<number>`count(*)::int`,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .where(and(openOrder, sql`${orderItems.station}<5`))
      .groupBy(orderItems.station);
    const reviewed =
      (
        await tx
          .select({ date: closedDays.date })
          .from(closedDays)
          .where(eq(closedDays.date, today))
          .limit(1)
      ).length > 0;
    const rows = await tx
        .select()
        .from(orders)
        .where(tasks)
        .orderBy(...orderSorting)
        .limit(5),
      data = await hydrateOrders(tx, rows);
    data.activity = await readActivity(tx, 3);
    data.closedDays = reviewed ? [today] : [];
    const { taskCount, ...counts } = summary;
    return {
      revision,
      today,
      data,
      page: pageInfo({ page: 1, pageSize: 5 }, Number(taskCount)),
      summary: {
        ...counts,
        collectedToday: Number(collected.value),
        reviewed,
        stations: Array.from({ length: 5 }, (_, station) =>
          Number(stationRows.find((r) => r.station === station)?.total ?? 0),
        ),
      },
    };
  });
