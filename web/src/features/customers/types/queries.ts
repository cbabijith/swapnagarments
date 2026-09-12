import type { WorkspacePage } from "@/shared/contracts/query";
export type CustomerRead = WorkspacePage & {
  orderCounts: Record<string, number>;
};
