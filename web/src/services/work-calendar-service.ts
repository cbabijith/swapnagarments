import "server-only";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { orderItems, orders, workCompletions } from "@/db/schema";
import type { SessionUser, PieceWork } from "@/features/team/contracts/team";
import type { CalendarMonthQuery } from "@/features/calendar/contracts/query";
import type { WorkCalendarDayQuery } from "@/features/team/contracts/work-calendar";
import type {
  WorkCalendarDayRead,
  WorkCalendarEntry,
  WorkCalendarMonthRead,
} from "@/features/team/types/work-calendar";
import {
  addWorkCalendarSummary,
  emptyWorkCalendarSummary,
  summarizeWorkCalendar,
  workerDueEntries,
} from "@/features/team/domain/work-calendar";
import { monthBounds, nextDate } from "@/features/calendar/domain/calendar";
import { currentStepName } from "@/features/workflow/domain/templates";
import { WorkspaceError } from "@/shared/errors";
import {
  offset,
  openOrder,
  pageInfo,
  withRead,
  type ReadContext,
} from "./read-context";

function workerId(user: SessionUser) {
  if (user.role !== "worker" || !user.staffId)
    throw new WorkspaceError(
      "Sign in with a worker account to view your calendar.",
      403,
    );
  return user.staffId;
}
const dueWhere = (id: string, from: string, to: string) =>
  and(
    openOrder,
    sql`${orderItems.station} < 5`,
    sql`${orderItems.work}->>'assigneeId' = ${id}`,
    sql`${orders.dueDate} >= ${from}::date and ${orders.dueDate} < ${to}::date`,
  );
const completedWhere = (id: string, from: string, to: string) =>
  and(
    eq(workCompletions.workerId, id),
    sql`${workCompletions.completedAt} >= ${`${from}T00:00:00+05:30`}::timestamptz and ${workCompletions.completedAt} < ${`${to}T00:00:00+05:30`}::timestamptz`,
  );
async function summaries(
  context: ReadContext,
  id: string,
  from: string,
  to: string,
) {
  const { tx, today, legacy } = context;
  const result = summarizeWorkCalendar(
    legacy ? workerDueEntries(legacy, id, from, to, today) : [],
  );
  if (!legacy) {
    const rows = await tx
      .select({
        date: orders.dueDate,
        count: sql<number>`count(*)::int`,
        overdue: sql<number>`count(*) filter (where ${orders.dueDate} < ${today}::date)::int`,
        inProgress: sql<number>`count(*) filter (where ${orderItems.work}->>'status' = 'in_progress')::int`,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .where(dueWhere(id, from, to))
      .groupBy(orders.dueDate);
    for (const row of rows) {
      const value = {
        counts: { due: row.count, completed: 0 },
        total: row.count,
        overdue: row.overdue,
        inProgress: row.inProgress,
      };
      addWorkCalendarSummary(
        (result.days[row.date] ??= emptyWorkCalendarSummary()),
        value,
      );
      addWorkCalendarSummary(result.summary, value);
    }
  }
  // Completion history is authoritative in both relational and JSON rollback modes.
  const date = sql<string>`to_char(${workCompletions.completedAt} at time zone 'Asia/Kolkata', 'YYYY-MM-DD')`;
  const rows = await tx
    .select({ date, count: sql<number>`count(*)::int` })
    .from(workCompletions)
    .where(completedWhere(id, from, to))
    .groupBy(date);
  for (const row of rows) {
    const value = {
      ...emptyWorkCalendarSummary(),
      counts: { due: 0, completed: row.count },
      total: row.count,
    };
    addWorkCalendarSummary(
      (result.days[row.date] ??= emptyWorkCalendarSummary()),
      value,
    );
    addWorkCalendarSummary(result.summary, value);
  }
  return result;
}
export function readWorkCalendarMonth(
  input: CalendarMonthQuery,
  user: SessionUser,
) {
  const id = workerId(user);
  return withRead(async (context): Promise<WorkCalendarMonthRead> => {
    const { from, to } = monthBounds(input.month);
    return {
      revision: context.revision,
      today: context.today,
      month: input.month,
      ...(await summaries(context, id, from, to)),
    };
  });
}
export function readWorkCalendarDay(
  input: WorkCalendarDayQuery,
  user: SessionUser,
) {
  const id = workerId(user);
  return withRead(async (context): Promise<WorkCalendarDayRead> => {
    const { tx, legacy, today, revision } = context;
    const from = input.date,
      to = nextDate(from);
    const { summary } = await summaries(context, id, from, to);
    const entries: WorkCalendarEntry[] = [];
    const start = offset(input);
    const dueCount = input.kind === "completed" ? 0 : summary.counts.due;
    // Due work appears first, followed by newest completions. Page boundaries can cross sources.
    if (start < dueCount) {
      if (legacy)
        entries.push(
          ...workerDueEntries(legacy, id, from, to, today).slice(
            start,
            start + input.pageSize,
          ),
        );
      else {
        const rows = await tx
          .select({
            orderId: orders.id,
            orderNumber: orders.number,
            pieceId: orderItems.id,
            garment: orderItems.garment,
            station: orderItems.station,
            workflow: orderItems.workflow,
            status: sql<
              PieceWork["status"]
            >`coalesce(${orderItems.work}->>'status', 'pending')`,
          })
          .from(orderItems)
          .innerJoin(orders, eq(orders.id, orderItems.orderId))
          .where(dueWhere(id, from, to))
          .orderBy(asc(sql`${orderItems.id} collate "C"`))
          .limit(input.pageSize)
          .offset(start);
        entries.push(
          ...rows.map(({ station, workflow, ...row }): WorkCalendarEntry => ({
            ...row,
            id: `due:${row.pieceId}`,
            kind: "due",
            date: from,
            time: null,
            stepName: currentStepName({
              station,
              workflow: workflow ?? undefined,
            }),
            overdue: from < today,
          })),
        );
      }
    }
    if (input.kind !== "due" && entries.length < input.pageSize) {
      const rows = await tx
        .select({
          id: workCompletions.id,
          orderId: workCompletions.orderId,
          orderNumber: workCompletions.orderNumber,
          pieceId: workCompletions.pieceId,
          garment: workCompletions.garment,
          stepName: workCompletions.stepName,
          time: workCompletions.completedAt,
        })
        .from(workCompletions)
        .where(completedWhere(id, from, to))
        .orderBy(desc(workCompletions.completedAt), desc(workCompletions.id))
        .limit(input.pageSize - entries.length)
        .offset(Math.max(0, start - dueCount));
      entries.push(
        ...rows.map((row): WorkCalendarEntry => ({
          ...row,
          time: new Date(row.time).toISOString(),
          kind: "completed",
          date: from,
          status: "completed",
          overdue: false,
        })),
      );
    }
    return {
      revision,
      date: from,
      entries,
      summary,
      page: pageInfo(
        input,
        input.kind === "all" ? summary.total : summary.counts[input.kind],
      ),
    };
  });
}
