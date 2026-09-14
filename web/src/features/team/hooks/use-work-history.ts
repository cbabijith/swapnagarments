"use client";
import { useInfiniteFeatureQuery } from "@/shared/hooks/use-infinite-feature-query";
import { entryPageAdapter } from "@/shared/queries/infinite-pages";
import type { WorkHistoryQuery } from "../contracts/work-history";
import type { WorkHistoryRead } from "../types/work-history";

export function useWorkHistory(input: WorkHistoryQuery) {
  const params = new URLSearchParams({
    page: String(input.page),
    pageSize: String(input.pageSize),
    q: input.q,
    station: input.station,
  });
  return useInfiniteFeatureQuery<WorkHistoryRead>(
    `/api/work/history?${params}`,
    (_workspace, page) => ({
      revision: 0,
      entries: [],
      page: {
        page,
        pageSize: input.pageSize,
        total: 0,
        pageCount: 0,
      },
    }),
    entryPageAdapter,
  );
}
