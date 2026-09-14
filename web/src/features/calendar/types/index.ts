import type { calendarKinds } from "@/features/calendar/contracts/query";
import type { PageInfo } from "@/shared/contracts/query";
import type { OrderStatus } from "@/features/orders/types";

export type CalendarKind = (typeof calendarKinds)[number];
export type CalendarSummary = {
  counts: Record<CalendarKind, number>;
  total: number;
  collected: number;
  overdue: number;
};
export type CalendarEntry = {
  id: string;
  kind: CalendarKind;
  date: string;
  time: string | null;
  orderId: string;
  orderNumber: string;
  customerName: string;
  status: OrderStatus;
  title: string;
  detail: string;
  amount: number | null;
  overdue: boolean;
};
export type CalendarMonthRead = {
  revision: number;
  today: string;
  month: string;
  days: Record<string, CalendarSummary>;
  summary: CalendarSummary;
};
export type CalendarDayRead = {
  revision: number;
  date: string;
  entries: CalendarEntry[];
  summary: CalendarSummary;
  page: PageInfo;
};
