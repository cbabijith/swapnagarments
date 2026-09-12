import "server-only";
import { changePiece } from "@/features/workflow/domain/changePiece";
import type { MutationContext } from "@/shared/domain/mutation-context";

export function workflowService(
  context: MutationContext<"piece.advance" | "piece.rework">,
) {
  return changePiece(context);
}
