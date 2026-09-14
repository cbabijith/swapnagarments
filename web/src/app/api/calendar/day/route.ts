import { calendarDayQuery } from "@/features/calendar/contracts/query";
import { readCalendarDay } from "@/services/calendar-read-service";
import { queryHandler } from "@/shared/server/query-handler";

export const GET = queryHandler(calendarDayQuery, readCalendarDay);
export const runtime = "nodejs";
