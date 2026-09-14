"use client";
import { useFeatureQuery } from "@/shared/hooks/use-feature-query";
import { useInfiniteFeatureQuery } from "@/shared/hooks/use-infinite-feature-query";
import { entryPageAdapter } from "@/shared/queries/infinite-pages";
import { useWorkspace } from "@/shared/compat/workspace-provider";
import { shopDate } from "@/shared/workspace";
import {
  previewWorkCalendarDay,
  previewWorkCalendarMonth,
} from "../domain/work-calendar";
import type { WorkCalendarDayQuery } from "../contracts/work-calendar";
import type {
  WorkCalendarDayRead,
  WorkCalendarMonthRead,
} from "../types/work-calendar";

export function useWorkCalendarMonth(month: string) {
  const { owner } = useWorkspace();
  return useFeatureQuery<WorkCalendarMonthRead>(
    `/api/work/calendar?month=${encodeURIComponent(month)}`,
    (data) => previewWorkCalendarMonth(data, owner.staffId, month, shopDate()),
  );
}
export function useWorkCalendarDay(input: WorkCalendarDayQuery) {
  const { owner } = useWorkspace();
  const params = new URLSearchParams({
    date: input.date,
    kind: input.kind,
    page: String(input.page),
    pageSize: String(input.pageSize),
  });
  return useInfiniteFeatureQuery<WorkCalendarDayRead>(
    `/api/work/calendar/day?${params}`,
    (data, page) =>
      previewWorkCalendarDay(
        data,
        owner.staffId,
        { ...input, page },
        shopDate(),
      ),
    entryPageAdapter,
  );
}
