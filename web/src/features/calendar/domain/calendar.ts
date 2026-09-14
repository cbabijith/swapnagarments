import { calendarKinds } from "@/features/calendar/contracts/query";
import type { CalendarDayQuery } from "@/features/calendar/contracts/query";
import type {
  CalendarEntry,
  CalendarSummary,
  CalendarMonthRead,
  CalendarDayRead,
} from "@/features/calendar/types";
import { isOpen, shopDate, type Workspace } from "@/shared/workspace";

export const calendarLabels = {
  due: "Orders due",
  created: "New orders",
  delivered: "Deliveries",
  payment: "Payments",
  activity: "Activity",
};
export const emptyCalendarSummary = (): CalendarSummary => ({
  counts: { due: 0, created: 0, delivered: 0, payment: 0, activity: 0 },
  total: 0,
  collected: 0,
  overdue: 0,
});
export function shiftMonth(month: string, delta: number) {
  const cursor = new Date(`${month}-01T12:00:00Z`);
  cursor.setUTCMonth(cursor.getUTCMonth() + delta);
  return cursor.toISOString().slice(0, 7);
}
export function monthBounds(month: string) {
  return { from: `${month}-01`, to: `${shiftMonth(month, 1)}-01` };
}
export function nextDate(date: string) {
  const cursor = new Date(`${date}T12:00:00Z`);
  cursor.setUTCDate(cursor.getUTCDate() + 1);
  return cursor.toISOString().slice(0, 10);
}
/** Monday first, with complete weeks and no browser-timezone dependency. */
export function monthGrid(month: string): (string | null)[] {
  const { from, to } = monthBounds(month);
  const lead = (new Date(`${from}T12:00:00Z`).getUTCDay() + 6) % 7;
  const cells: (string | null)[] = Array.from({ length: lead }, () => null);
  for (let day = from; day < to; day = nextDate(day)) cells.push(day);
  while (cells.length % 7) cells.push(null);
  return cells;
}
export function addSummary(target: CalendarSummary, source: CalendarSummary) {
  for (const kind of calendarKinds) target.counts[kind] += source.counts[kind];
  target.total += source.total;
  target.collected += source.collected;
  target.overdue += source.overdue;
}
export function summarizeEntries(entries: CalendarEntry[]) {
  const result = emptyCalendarSummary();
  for (const entry of entries) {
    result.counts[entry.kind]++;
    result.total++;
    if (entry.kind === "payment") result.collected += entry.amount ?? 0;
    if (entry.overdue) result.overdue++;
  }
  return result;
}
/** Compatibility selection for JSON storage and the explicit sample preview. */
export function calendarEntries(
  data: Workspace,
  from: string,
  to: string,
  today: string,
): CalendarEntry[] {
  const entries: CalendarEntry[] = [];
  const customers = new Map(
    data.customers.map((customer) => [customer.id, customer.name]),
  );
  const orders = new Map(data.orders.map((order) => [order.id, order]));
  const append = (entry: CalendarEntry) => {
    if (entry.date >= from && entry.date < to) entries.push(entry);
  };
  for (const order of data.orders) {
    const base = {
      orderId: order.id,
      orderNumber: order.number,
      customerName: customers.get(order.customerId) ?? "Customer",
      status: order.status,
      amount: null,
      overdue: false,
    };
    if (order.status !== "cancelled")
      append({
        ...base,
        id: `due:${order.id}`,
        kind: "due",
        date: order.dueDate,
        time: null,
        title: "Order due",
        detail: "Scheduled delivery date",
        overdue: isOpen(order) && order.dueDate < today,
      });
    append({
      ...base,
      id: `created:${order.id}`,
      kind: "created",
      date: shopDate(new Date(order.createdAt)),
      time: new Date(order.createdAt).toISOString(),
      title: "Order received",
      detail: order.notes,
    });
    if (order.deliveredAt)
      append({
        ...base,
        id: `delivered:${order.id}`,
        kind: "delivered",
        date: shopDate(new Date(order.deliveredAt)),
        time: new Date(order.deliveredAt).toISOString(),
        title: "Order delivered",
        detail: "Handed over to the customer",
      });
    for (const payment of order.payments)
      append({
        ...base,
        id: `payment:${payment.id}`,
        kind: "payment",
        date: shopDate(new Date(payment.date)),
        time: new Date(payment.date).toISOString(),
        title: "Payment received",
        detail: payment.method,
        amount: payment.amount,
      });
  }
  for (const activity of data.activity) {
    const order = orders.get(activity.orderId);
    if (order)
      append({
        id: `activity:${activity.id}`,
        kind: "activity",
        date: shopDate(new Date(activity.time)),
        time: new Date(activity.time).toISOString(),
        orderId: order.id,
        orderNumber: order.number,
        customerName: customers.get(order.customerId) ?? "Customer",
        status: order.status,
        title: activity.title,
        detail: activity.detail,
        amount: null,
        overdue: false,
      });
  }
  return entries.sort((a, b) => {
    if (a.time === null && b.time !== null) return -1;
    if (b.time === null && a.time !== null) return 1;
    return (
      (b.time ?? "").localeCompare(a.time ?? "") ||
      (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
    );
  });
}
export function selectCalendarMonth(
  data: Workspace,
  month: string,
  today: string,
  revision = 0,
): CalendarMonthRead {
  const { from, to } = monthBounds(month);
  const days: Record<string, CalendarSummary> = {};
  const summary = emptyCalendarSummary();
  for (const entry of calendarEntries(data, from, to, today)) {
    const day = (days[entry.date] ??= emptyCalendarSummary());
    const value = summarizeEntries([entry]);
    addSummary(day, value);
    addSummary(summary, value);
  }
  return { revision, today, month, days, summary };
}
export function selectCalendarDay(
  data: Workspace,
  input: CalendarDayQuery,
  today: string,
  revision = 0,
): CalendarDayRead {
  const entries = calendarEntries(
    data,
    input.date,
    nextDate(input.date),
    today,
  );
  const filtered = entries.filter(
    (entry) => input.kind === "all" || entry.kind === input.kind,
  );
  const start = (input.page - 1) * input.pageSize;
  return {
    revision,
    date: input.date,
    summary: summarizeEntries(entries),
    entries: filtered.slice(start, start + input.pageSize),
    page: {
      page: input.page,
      pageSize: input.pageSize,
      total: filtered.length,
      pageCount: Math.ceil(filtered.length / input.pageSize),
    },
  };
}
