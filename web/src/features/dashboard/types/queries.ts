import type { WorkspacePage } from "@/shared/contracts/query";
export type DashboardRead = WorkspacePage & {
  today: string;
  summary: {
    open: number;
    due: number;
    overdue: number;
    inProgress: number;
    ready: number;
    collectedToday: number;
    deliveredToday: number;
    unfinished: number;
    todayTotal: number;
    todayFinished: number;
    reviewed: boolean;
    stations: number[];
  };
};
