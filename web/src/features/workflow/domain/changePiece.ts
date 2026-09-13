import { STATIONS, type Workspace, isOpen } from "@/shared/workspace";
import { WorkspaceError } from "@/shared/errors";
import type { MutationContext } from "@/shared/domain/mutation-context";
import { currentStepName } from "./templates";

export function changePiece({
  data,
  action,
  event,
}: MutationContext<"piece.advance" | "piece.rework">): {
  data: Workspace;
  resultId?: string;
} {
  const order = data.orders.find((entry) => entry.id === action.orderId);
  if (!order) throw new WorkspaceError("Order not found.", 404);
  if (!isOpen(order))
    throw new WorkspaceError(
      "This order is closed and cannot be changed.",
      409,
    );
  const piece = order.items.find((item) => item.id === action.pieceId);
  if (!piece) throw new WorkspaceError("Garment not found.", 404);
  if (piece.measurement && !piece.measurement.confirmed)
    throw new WorkspaceError(
      "Confirm this piece's measurements in the order before starting production.",
      409,
    );
  if (
    piece.workflow &&
    action.expectedWorkflowVersion !== piece.workflow.version
  )
    throw new WorkspaceError(
      "This garment’s workflow progress changed. Refresh and try again.",
      409,
    );
  if (action.type === "piece.advance") {
    if (piece.work?.status === "blocked")
      throw new WorkspaceError(
        "Resume blocked work before completing this station.",
        409,
      );
    if (
      piece.station !== action.expectedStation ||
      piece.station >= STATIONS.length
    )
      throw new WorkspaceError(
        "This garment’s progress has changed. Refresh and try again.",
        409,
      );
    const completed = currentStepName(piece);
    if (piece.workflow) {
      piece.workflow.position++;
      piece.workflow.version++;
      piece.station =
        piece.workflow.steps[piece.workflow.position]?.station ?? 5;
    } else piece.station++;
    event(
      order.id,
      `${completed} complete`,
      `${order.number} · ${piece.garment}`,
    );
  } else {
    if (piece.workflow) {
      const position = piece.workflow.steps.findIndex(
        (s) => s.id === action.stepId && s.station === action.station,
      );
      if (position < 0 || position > piece.workflow.position)
        throw new WorkspaceError(
          "Choose the current step or an earlier workflow step for correction.",
        );
      piece.workflow.position = position;
      piece.workflow.version++;
    }
    piece.station = action.station;
    event(
      order.id,
      `Correction at ${currentStepName(piece).toLowerCase()}`,
      action.reason,
    );
  }
  if (piece.work)
    piece.work = { version: piece.work.version + 1, status: "pending" };
  order.status = order.items.every((item) => item.station === STATIONS.length)
    ? "ready"
    : "in_progress";
  return { data, resultId: order.id };
}
