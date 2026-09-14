import type { Workspace } from "@/shared/workspace";
import { currentStepName } from "@/features/workflow/domain/templates";
import { monthBounds, nextDate } from "@/features/calendar/domain/calendar";
import { openPieces } from "./assignment";
import type { WorkCalendarDayQuery } from "../contracts/work-calendar";
import type {
  WorkCalendarEntry,
  WorkCalendarSummary,
  WorkCalendarDayRead,
  WorkCalendarMonthRead,
} from "../types/work-calendar";

export const workCalendarLabels = { due: "Work due", completed: "Completed" };
export const emptyWorkCalendarSummary = (): WorkCalendarSummary => ({
  counts: { due: 0, completed: 0 },
  total: 0,
  overdue: 0,
  inProgress: 0,
});
export function addWorkCalendarSummary(
  target: WorkCalendarSummary,
  value: WorkCalendarSummary,
) {
  target.counts.due += value.counts.due;
  target.counts.completed += value.counts.completed;
  target.total += value.total;
  target.overdue += value.overdue;
  target.inProgress += value.inProgress;
}
/** Current assignments only. Completed stages come from the immutable server ledger. */
export function workerDueEntries(
  data: Workspace,
  staffId: string | undefined,
  from: string,
  to: string,
  today: string,
): WorkCalendarEntry[] {
  if (!staffId) return [];
  return openPieces(data)
    .filter(
      ({ order, item }) =>
        item.work?.assigneeId === staffId &&
        order.dueDate >= from &&
        order.dueDate < to,
    )
    .map(({ order, item }): WorkCalendarEntry => ({
      id: `due:${item.id}`,
      kind: "due",
      date: order.dueDate,
      time: null,
      orderId: order.id,
      orderNumber: order.number,
      pieceId: item.id,
      garment: item.garment,
      stepName: currentStepName(item),
      status: item.work?.status ?? "pending",
      overdue: order.dueDate < today,
    }))
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}
export function summarizeWorkCalendar(entries: WorkCalendarEntry[]) {
  const days: Record<string, WorkCalendarSummary> = {};
  const summary = emptyWorkCalendarSummary();
  for (const entry of entries) {
    const value = emptyWorkCalendarSummary();
    value.counts[entry.kind] = 1;
    value.total = 1;
    value.overdue = Number(entry.overdue);
    value.inProgress = Number(entry.status === "in_progress");
    addWorkCalendarSummary(
      (days[entry.date] ??= emptyWorkCalendarSummary()),
      value,
    );
    addWorkCalendarSummary(summary, value);
  }
  return { days, summary };
}
export function previewWorkCalendarMonth(
  data: Workspace,
  staffId: string | undefined,
  month: string,
  today: string,
): WorkCalendarMonthRead {
  const { from, to } = monthBounds(month);
  return {
    revision: 0,
    today,
    month,
    ...summarizeWorkCalendar(workerDueEntries(data, staffId, from, to, today)),
  };
}
export function previewWorkCalendarDay(
  data: Workspace,
  staffId: string | undefined,
  input: WorkCalendarDayQuery,
  today: string,
): WorkCalendarDayRead {
  const all = workerDueEntries(
    data,
    staffId,
    input.date,
    nextDate(input.date),
    today,
  );
  const entries = input.kind === "completed" ? [] : all;
  return {
    revision: 0,
    date: input.date,
    summary: summarizeWorkCalendar(all).summary,
    entries: entries.slice(
      (input.page - 1) * input.pageSize,
      input.page * input.pageSize,
    ),
    page: {
      page: input.page,
      pageSize: input.pageSize,
      total: entries.length,
      pageCount: Math.ceil(entries.length / input.pageSize),
    },
  };
}
