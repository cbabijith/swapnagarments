import type { WorkspacePage } from "@/shared/contracts/query";
import { recordPage, uniqueRecords } from "./infinite-pages";

/** Compatibility DTO merging; features retain ownership of their additional metadata. */
export function mergeWorkspacePages<T extends WorkspacePage>(pages: T[]): T {
  const latest = pages[pages.length - 1];
  return {
    ...latest,
    data: {
      ...latest.data,
      customers: uniqueRecords(
        pages.flatMap((p) => p.data.customers),
        (r) => r.id,
      ),
      orders: uniqueRecords(
        pages.flatMap((p) => p.data.orders),
        (r) => r.id,
      ),
      activity: uniqueRecords(
        pages.flatMap((p) => p.data.activity),
        (r) => r.id,
      ),
      staff: uniqueRecords(
        pages.flatMap((p) => p.data.staff),
        (r) => r.id,
      ),
      dayReports: uniqueRecords(
        pages.flatMap((p) => p.data.dayReports ?? []),
        (r) => r.date,
      ),
      closedDays: [...new Set(pages.flatMap((p) => p.data.closedDays))],
    },
  };
}

export const workspacePageAdapter = {
  page: recordPage,
  merge: mergeWorkspacePages,
};
