import { z } from "zod";
import { date } from "@/shared/contracts/fields";
import { pageQuery } from "@/shared/contracts/query-input";

export const calendarKinds = [
  "due",
  "created",
  "delivered",
  "payment",
  "activity",
] as const;
export const calendarDate = date.refine(
  (value) => value >= "0001-01-01" && value <= "9998-12-31",
  "Choose a date between years 1 and 9998.",
);
export const calendarMonth = z
  .string()
  .regex(/^\d{4}-\d{2}$/)
  .refine(
    (value) => calendarDate.safeParse(`${value}-01`).success,
    "Choose a valid month.",
  );
export const calendarMonthQuery = z.object({ month: calendarMonth }).strict();
export const calendarDayQuery = pageQuery
  .extend({
    date: calendarDate,
    kind: z.enum(["all", ...calendarKinds]).default("all"),
  })
  .strict();
export type CalendarMonthQuery = z.infer<typeof calendarMonthQuery>;
export type CalendarDayQuery = z.infer<typeof calendarDayQuery>;
