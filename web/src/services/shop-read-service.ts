import "server-only";
import { asc, desc, sql } from "drizzle-orm";
import { orders, staff, dayReports } from "@/db/schema";
import { iso } from "@/db/workspace-validation";
import { emptyWorkspace, isOpen } from "@/shared/workspace";
import type { PageQuery } from "@/shared/contracts/query-input";
import type { WorkspacePage } from "@/shared/contracts/query";
import type { ShellRead } from "@/shared/contracts/shell-query";
import {
  withRead,
  countRows,
  openOrder,
  readActivity,
  pageInfo,
  slicePage,
  offset,
} from "./read-context";

export const readShell = () =>
  withRead(async ({ tx, revision, legacy }): Promise<ShellRead> => ({
    revision,
    openOrders: legacy
      ? legacy.orders.filter(isOpen).length
      : await countRows(tx, orders, openOrder),
    activity: legacy ? legacy.activity.slice(0, 8) : await readActivity(tx, 8),
  }));
export const readTeam = (input: PageQuery) =>
  withRead(async ({ tx, revision, legacy }): Promise<WorkspacePage> => {
    const data = emptyWorkspace();
    if (legacy) {
      data.staff = slicePage(legacy.staff, input);
      return { revision, data, page: pageInfo(input, legacy.staff.length) };
    }
    const [count] = await tx
      .select({ total: sql<number>`count(*)::int` })
      .from(staff);
    const rows = await tx
      .select()
      .from(staff)
      .orderBy(asc(staff.position), asc(staff.id))
      .limit(input.pageSize)
      .offset(offset(input));
    data.staff = rows.map((p) => ({
      id: p.id,
      name: p.name,
      role: p.role,
      station: p.station,
      color: p.color,
    }));
    return { revision, data, page: pageInfo(input, Number(count.total)) };
  });
export const readReports = (input: PageQuery) =>
  withRead(async ({ tx, revision, legacy }): Promise<WorkspacePage> => {
    const data = emptyWorkspace();
    if (legacy) {
      const reports = [...(legacy.dayReports ?? [])].sort((a, b) =>
        b.date.localeCompare(a.date),
      );
      data.dayReports = slicePage(reports, input);
      data.closedDays = data.dayReports.map((r) => r.date);
      return { revision, data, page: pageInfo(input, reports.length) };
    }
    const [count] = await tx
      .select({ total: sql<number>`count(*)::int` })
      .from(dayReports);
    const rows = await tx
      .select()
      .from(dayReports)
      .orderBy(desc(dayReports.date))
      .limit(input.pageSize)
      .offset(offset(input));
    data.dayReports = rows.map((r) => ({
      date: r.date,
      reviewedBy: r.reviewedBy,
      reviewedAt: iso(r.reviewedAt),
      delivered: r.delivered,
      ready: r.ready,
      unfinished: r.unfinished,
      collected: r.collected,
      pending: r.pending,
    }));
    data.closedDays = data.dayReports.map((r) => r.date);
    return { revision, data, page: pageInfo(input, Number(count.total)) };
  });
