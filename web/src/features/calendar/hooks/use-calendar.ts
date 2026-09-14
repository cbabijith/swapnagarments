"use client";

import { useFeatureQuery } from "@/shared/hooks/use-feature-query";
import { useInfiniteFeatureQuery } from "@/shared/hooks/use-infinite-feature-query";
import { entryPageAdapter } from "@/shared/queries/infinite-pages";
import { shopDate } from "@/shared/workspace";
import {
  selectCalendarDay,
  selectCalendarMonth,
} from "@/features/calendar/domain/calendar";
import type { CalendarDayQuery } from "@/features/calendar/contracts/query";
import type {
  CalendarDayRead,
  CalendarMonthRead,
} from "@/features/calendar/types";

export function useCalendarMonth(month: string) {
  return useFeatureQuery<CalendarMonthRead>(
    `/api/calendar?month=${encodeURIComponent(month)}`,
    (workspace) => selectCalendarMonth(workspace, month, shopDate()),
  );
}
export function useCalendarDay(input: CalendarDayQuery) {
  const params = new URLSearchParams({
    date: input.date,
    kind: input.kind,
    page: String(input.page),
    pageSize: String(input.pageSize),
  });
  return useInfiniteFeatureQuery<CalendarDayRead>(
    `/api/calendar/day?${params}`,
    (workspace, page) =>
      selectCalendarDay(workspace, { ...input, page }, shopDate()),
    entryPageAdapter,
  );
}
