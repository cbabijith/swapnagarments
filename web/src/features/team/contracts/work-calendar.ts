import { z } from "zod";
import {
  calendarDate,
  calendarMonthQuery,
} from "@/features/calendar/contracts/query";
import { pageQuery } from "@/shared/contracts/query-input";

export const workCalendarKinds = ["due", "completed"] as const;
export const workCalendarMonthQuery = calendarMonthQuery;
export const workCalendarDayQuery = pageQuery
  .extend({
    date: calendarDate,
    kind: z.enum(["all", ...workCalendarKinds]).default("all"),
  })
  .strict();
export type WorkCalendarDayQuery = z.infer<typeof workCalendarDayQuery>;
