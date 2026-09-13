"use client";
import { useWorkspace } from "@/shared/compat/workspace-provider";
import type { WorkspaceMutation } from "@/shared/contracts/command";

export function useWorkflow() {
  const workspace = useWorkspace();
  return {
    ...workspace,
    advancePiece: async (
      orderId: string,
      pieceId: string,
      expectedStation: number,
      expectedWorkflowVersion?: number,
    ) => {
      await workspace.send(
        {
          type: "piece.advance",
          orderId,
          pieceId,
          expectedStation,
          expectedWorkflowVersion,
        } satisfies WorkspaceMutation,
        "Garment progress saved.",
      );
    },
    rework: async (
      orderId: string,
      pieceId: string,
      station: number,
      reason: string,
      stepId?: string,
      expectedWorkflowVersion?: number,
    ) => {
      await workspace.send(
        {
          type: "piece.rework",
          orderId,
          pieceId,
          station,
          reason,
          stepId,
          expectedWorkflowVersion,
        },
        "Correction requested.",
      );
    },
  };
}
