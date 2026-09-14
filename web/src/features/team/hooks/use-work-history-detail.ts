"use client";
import { useFeatureQuery } from "@/shared/hooks/use-feature-query";
import type { WorkHistoryDetailRead } from "../types/work-history";

export function useWorkHistoryDetail(id: string) {
  return useFeatureQuery<WorkHistoryDetailRead | null>(
    `/api/work/history/${encodeURIComponent(id)}`,
    () => null,
  );
}
