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
    ) => {
      await workspace.send(
        {
          type: "piece.advance",
          orderId,
          pieceId,
          expectedStation,
        } satisfies WorkspaceMutation,
        "Garment progress saved.",
      );
    },
    rework: async (
      orderId: string,
      pieceId: string,
      station: number,
      reason: string,
    ) => {
      await workspace.send(
        { type: "piece.rework", orderId, pieceId, station, reason },
        "Correction requested.",
      );
    },
  };
}
