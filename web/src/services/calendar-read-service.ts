import "server-only";
import { and, asc, desc, eq, sql, type SQL } from "drizzle-orm";
import { unionAll } from "drizzle-orm/pg-core";
import type { DatabaseTransaction } from "@/db";
import { orders, customers, payments, activity } from "@/db/schema";
import type {
  CalendarDayQuery,
  CalendarMonthQuery,
} from "@/features/calendar/contracts/query";
import type {
  CalendarDayRead,
  CalendarKind,
  CalendarMonthRead,
  CalendarSummary,
} from "@/features/calendar/types";
import {
  addSummary,
  emptyCalendarSummary,
  monthBounds,
  nextDate,
  selectCalendarDay,
  selectCalendarMonth,
} from "@/features/calendar/domain/calendar";
import { offset, pageInfo, withRead } from "./read-context";

/** Each source filters in PostgreSQL before union, grouping or pagination. */
function eventsInRange(
  tx: DatabaseTransaction,
  from: string,
  to: string,
  today: string,
) {
  const inRange = (
    column:
      | typeof orders.createdAt
      | typeof orders.deliveredAt
      | typeof payments.paidAt
      | typeof activity.time,
  ) =>
    sql`${column} >= ${`${from}T00:00:00+05:30`}::timestamptz and ${column} < ${`${to}T00:00:00+05:30`}::timestamptz`;
  const day = (
    column:
      | typeof orders.createdAt
      | typeof orders.deliveredAt
      | typeof payments.paidAt
      | typeof activity.time,
  ) =>
    sql<string>`to_char(${column} at time zone 'Asia/Kolkata', 'YYYY-MM-DD')`.as(
      "event_date",
    );
  const fields = (
    kind: CalendarKind,
    id: SQL,
    date: SQL.Aliased<string>,
    time: SQL,
    title: SQL,
    detail: SQL,
    amount: SQL = sql`null::integer`,
    overdue: SQL = sql`false`,
  ) => ({
    id: sql<string>`${kind} || ':' || ${id}`.as("event_id"),
    kind: sql<CalendarKind>`${kind}::text`.as("kind"),
    date,
    time: sql<string | null>`${time}`.as("event_time"),
    orderId: orders.id,
    orderNumber: orders.number,
    customerName: customers.name,
    status: orders.status,
    title: sql<string>`${title}`.as("title"),
    detail: sql<string>`${detail}`.as("detail"),
    amount: sql<number | null>`${amount}`.as("amount"),
    overdue: sql<boolean>`${overdue}`.as("overdue"),
  });
  const due = tx
    .select(
      fields(
        "due",
        sql`${orders.id}`,
        sql<string>`${orders.dueDate}::text`.as("event_date"),
        sql`null::timestamptz`,
        sql`'Order due'::text`,
        sql`'Scheduled delivery date'::text`,
        undefined,
        sql`${orders.status} not in ('delivered','cancelled') and ${orders.dueDate} < ${today}::date`,
      ),
    )
    .from(orders)
    .innerJoin(customers, eq(customers.id, orders.customerId))
    .where(
      sql`${orders.dueDate} >= ${from}::date and ${orders.dueDate} < ${to}::date and ${orders.status} <> 'cancelled'`,
    );
  const created = tx
    .select(
      fields(
        "created",
        sql`${orders.id}`,
        day(orders.createdAt),
        sql`${orders.createdAt}`,
        sql`'Order received'::text`,
        sql`${orders.notes}`,
      ),
    )
    .from(orders)
    .innerJoin(customers, eq(customers.id, orders.customerId))
    .where(inRange(orders.createdAt));
  const delivered = tx
    .select(
      fields(
        "delivered",
        sql`${orders.id}`,
        day(orders.deliveredAt),
        sql`${orders.deliveredAt}`,
        sql`'Order delivered'::text`,
        sql`'Handed over to the customer'::text`,
      ),
    )
    .from(orders)
    .innerJoin(customers, eq(customers.id, orders.customerId))
    .where(inRange(orders.deliveredAt));
  const received = tx
    .select(
      fields(
        "payment",
        sql`${payments.id}`,
        day(payments.paidAt),
        sql`${payments.paidAt}`,
        sql`'Payment received'::text`,
        sql`${payments.method}`,
        sql`${payments.amount}`,
      ),
    )
    .from(payments)
    .innerJoin(orders, eq(orders.id, payments.orderId))
    .innerJoin(customers, eq(customers.id, orders.customerId))
    .where(inRange(payments.paidAt));
  const recorded = tx
    .select(
      fields(
        "activity",
        sql`${activity.id}`,
        day(activity.time),
        sql`${activity.time}`,
        sql`${activity.title}`,
        sql`${activity.detail}`,
      ),
    )
    .from(activity)
    .innerJoin(orders, eq(orders.id, activity.orderId))
    .innerJoin(customers, eq(customers.id, orders.customerId))
    .where(inRange(activity.time));
  return unionAll(due, created, delivered, received, recorded).as(
    "calendar_events",
  );
}
async function summaries(
  tx: DatabaseTransaction,
  events: ReturnType<typeof eventsInRange>,
) {
  const rows = await tx
    .select({
      date: events.date,
      kind: events.kind,
      count: sql<number>`count(*)::int`,
      collected: sql<string>`coalesce(sum(${events.amount}), 0)`,
      overdue: sql<number>`count(*) filter (where ${events.overdue})::int`,
    })
    .from(events)
    .groupBy(events.date, events.kind);
  const days: Record<string, CalendarSummary> = {};
  const summary = emptyCalendarSummary();
  for (const row of rows) {
    const value = emptyCalendarSummary();
    value.counts[row.kind] = Number(row.count);
    value.total = Number(row.count);
    value.collected = Number(row.collected);
    value.overdue = Number(row.overdue);
    addSummary((days[row.date] ??= emptyCalendarSummary()), value);
    addSummary(summary, value);
  }
  return { days, summary };
}
export const readCalendarMonth = (input: CalendarMonthQuery) =>
  withRead(
    async ({ tx, legacy, revision, today }): Promise<CalendarMonthRead> => {
      if (legacy)
        return selectCalendarMonth(legacy, input.month, today, revision);
      const { from, to } = monthBounds(input.month);
      return {
        revision,
        today,
        month: input.month,
        ...(await summaries(tx, eventsInRange(tx, from, to, today))),
      };
    },
  );
export const readCalendarDay = (input: CalendarDayQuery) =>
  withRead(
    async ({ tx, legacy, revision, today }): Promise<CalendarDayRead> => {
      if (legacy) return selectCalendarDay(legacy, input, today, revision);
      const events = eventsInRange(tx, input.date, nextDate(input.date), today);
      const { summary } = await summaries(tx, events);
      const entries = await tx
        .select()
        .from(events)
        .where(
          and(input.kind === "all" ? undefined : eq(events.kind, input.kind)),
        )
        .orderBy(
          sql`${events.time} is not null`,
          desc(events.time),
          asc(sql`${events.id} collate "C"`),
        )
        .limit(input.pageSize)
        .offset(offset(input));
      return {
        revision,
        date: input.date,
        summary,
        entries: entries.map((entry) => ({
          ...entry,
          time: entry.time ? new Date(entry.time).toISOString() : null,
        })),
        page: pageInfo(
          input,
          input.kind === "all" ? summary.total : summary.counts[input.kind],
        ),
      };
    },
  );
