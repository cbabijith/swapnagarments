import type { WorkspacePage } from "@/shared/contracts/query";
export type BillingRead = WorkspacePage & {
  totals: { pending: number; collected: number };
};
