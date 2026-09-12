import { STATIONS, type Workspace, isOpen } from "@/shared/workspace";
import { WorkspaceError } from "@/shared/errors";
import type { MutationContext } from "@/shared/domain/mutation-context";

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
  if (action.type === "piece.advance") {
    if (
      piece.station !== action.expectedStation ||
      piece.station >= STATIONS.length
    )
      throw new WorkspaceError(
        "This garment’s progress has changed. Refresh and try again.",
        409,
      );
    const completed = STATIONS[piece.station];
    piece.station++;
    event(
      order.id,
      `${completed} complete`,
      `${order.number} · ${piece.garment}`,
    );
  } else {
    piece.station = action.station;
    event(
      order.id,
      `Correction at ${STATIONS[action.station].toLowerCase()}`,
      action.reason,
    );
  }
  order.status = order.items.every((item) => item.station === STATIONS.length)
    ? "ready"
    : "in_progress";
  return { data, resultId: order.id };
}
