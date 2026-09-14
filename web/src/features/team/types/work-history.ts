import type { PageInfo } from "@/shared/contracts/query";
import type { MeasurementSnapshot } from "@/features/measurements/contracts/profiles";
import type { DesignSnapshot } from "@/features/design-library/contracts";
import type { Priority } from "@/features/orders/types";

export type WorkCompletionSnapshot = {
  material: string;
  priority: Priority;
  dueDate: string;
  assignedAt?: string;
  startedAt?: string;
  measurement?: Pick<
    MeasurementSnapshot,
    "unit" | "fields" | "values" | "confirmed" | "image"
  >;
  design?: DesignSnapshot;
};

export type CompletedWork = {
  id: string;
  orderNumber: string;
  pieceId: string;
  garment: string;
  station: number;
  stepName: string;
  completedAt: string;
  customer?: { name: string; phone: string } | null;
};
export type WorkHistoryRead = {
  revision: number;
  entries: CompletedWork[];
  page: PageInfo;
};
export type WorkHistoryDetailRead = {
  revision: number;
  entry: CompletedWork & { snapshot: WorkCompletionSnapshot | null };
};
