import type { PageInfo } from "@/shared/contracts/query";
import type { PieceWork } from "../contracts/team";
import type { workCalendarKinds } from "../contracts/work-calendar";

export type WorkCalendarKind = (typeof workCalendarKinds)[number];
export type WorkCalendarSummary = {
  counts: Record<WorkCalendarKind, number>;
  total: number;
  overdue: number;
  inProgress: number;
};
export type WorkCalendarEntry = {
  id: string;
  kind: WorkCalendarKind;
  date: string;
  time: string | null;
  orderId: string;
  orderNumber: string;
  pieceId: string;
  garment: string;
  stepName: string;
  status: PieceWork["status"] | "completed";
  overdue: boolean;
};
export type WorkCalendarMonthRead = {
  revision: number;
  today: string;
  month: string;
  days: Record<string, WorkCalendarSummary>;
  summary: WorkCalendarSummary;
};
export type WorkCalendarDayRead = {
  revision: number;
  date: string;
  entries: WorkCalendarEntry[];
  summary: WorkCalendarSummary;
  page: PageInfo;
};
