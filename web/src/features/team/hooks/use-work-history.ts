"use client";
import { useFeatureQuery } from "@/shared/hooks/use-feature-query";
import type { WorkHistoryQuery } from "../contracts/work-history";
import type { WorkHistoryRead } from "../types/work-history";

export function useWorkHistory(input: WorkHistoryQuery) {
  const params = new URLSearchParams({
    page: String(input.page),
    pageSize: String(input.pageSize),
    q: input.q,
    station: input.station,
  });
  return useFeatureQuery<WorkHistoryRead>(
    `/api/work/history?${params}`,
    () => ({
      revision: 0,
      entries: [],
      page: {
        page: input.page,
        pageSize: input.pageSize,
        total: 0,
        pageCount: 0,
      },
    }),
  );
}
