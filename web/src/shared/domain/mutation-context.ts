import type { WorkspaceMutation } from "@/shared/contracts/command";
import type { Workspace } from "@/shared/workspace";

export type MutationContext<T extends WorkspaceMutation["type"]> = {
  data: Workspace;
  assets?: import("@/features/design-library/domain/designs").AssetMap;
  action: Extract<WorkspaceMutation, { type: T }>;
  actor: string;
  today: string;
  timestamp: string;
  event: (orderId: string, title: string, detail: string) => void;
};
