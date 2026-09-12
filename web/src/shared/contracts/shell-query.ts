import type { Activity } from "@/shared/workspace";
export type ShellRead = {
  revision: number;
  openOrders: number;
  activity: Activity[];
};
