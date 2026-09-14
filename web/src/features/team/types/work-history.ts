import type { PageInfo } from "@/shared/contracts/query";

export type CompletedWork = {
  id: string;
  orderNumber: string;
  pieceId: string;
  garment: string;
  station: number;
  stepName: string;
  completedAt: string;
};
export type WorkHistoryRead = {
  revision: number;
  entries: CompletedWork[];
  page: PageInfo;
};
