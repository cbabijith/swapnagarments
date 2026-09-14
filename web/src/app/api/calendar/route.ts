import { calendarMonthQuery } from "@/features/calendar/contracts/query";
import { readCalendarMonth } from "@/services/calendar-read-service";
import { queryHandler } from "@/shared/server/query-handler";

export const GET = queryHandler(calendarMonthQuery, readCalendarMonth);
export const runtime = "nodejs";
