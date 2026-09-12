import {
  STATIONS,
  type Workspace,
  total,
  paid,
  isOpen,
} from "@/shared/workspace";
import { WorkspaceError } from "@/shared/errors";
import type { MutationContext } from "@/shared/domain/mutation-context";

export function deliverOrder({
  data,
  action,
  timestamp,
  event,
}: MutationContext<"order.deliver">): { data: Workspace; resultId?: string } {
  const order = data.orders.find((entry) => entry.id === action.orderId);
  if (!order) throw new WorkspaceError("Order not found.", 404);
  if (!isOpen(order))
    throw new WorkspaceError(
      "This order is closed and cannot be changed.",
      409,
    );
  if (
    order.status !== "ready" ||
    !order.items.every((item) => item.station === STATIONS.length)
  )
    throw new WorkspaceError("Finish every garment before delivery.", 409);
  if (paid(order) !== total(order))
    throw new WorkspaceError("Settle the balance before delivery.", 409);
  order.status = "delivered";
  order.deliveredAt = timestamp;
  event(order.id, "Another happy handover", `${order.number} was delivered.`);
  return { data, resultId: order.id };
}
