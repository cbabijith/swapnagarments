import { type Workspace, balance, isOpen } from "@/shared/workspace";
import { WorkspaceError } from "@/shared/errors";
import type { MutationContext } from "@/shared/domain/mutation-context";

export function recordPayment({
  data,
  action,
  timestamp,
  event,
}: MutationContext<"payment.record">): { data: Workspace; resultId?: string } {
  const order = data.orders.find((entry) => entry.id === action.orderId);
  if (!order) throw new WorkspaceError("Order not found.", 404);
  if (!isOpen(order))
    throw new WorkspaceError(
      "This order is closed and cannot be changed.",
      409,
    );
  if (action.amount > balance(order))
    throw new WorkspaceError("This amount exceeds the remaining balance.", 409);
  order.payments.push({
    id: crypto.randomUUID(),
    amount: action.amount,
    method: action.method,
    date: timestamp,
  });
  event(order.id, "Payment recorded", `${order.number} · ${action.method}`);
  return { data, resultId: order.id };
}
