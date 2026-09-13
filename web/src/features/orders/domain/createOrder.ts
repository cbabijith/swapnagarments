import { type Workspace, type Order } from "@/shared/workspace";
import { WorkspaceError } from "@/shared/errors";
import type { MutationContext } from "@/shared/domain/mutation-context";
import { snapshotWorkflow } from "@/features/workflow/domain/templates";
import { catalogueFor } from "@/features/settings/domain/catalogue";
import {
  calculateGst,
  gstSettingsFor,
  totalWithGst,
} from "@/features/billing/domain/gst";

export function createOrder({
  data,
  action,
  timestamp,
  today,
  event,
}: MutationContext<"order.create">): { data: Workspace; resultId?: string } {
  if (!data.customers.some((entry) => entry.id === action.customerId))
    throw new WorkspaceError("Choose an existing customer.");
  if (action.dueDate < today)
    throw new WorkspaceError("The delivery date cannot be in the past.");
  const subtotal = action.items.reduce((sum, item) => sum + item.price, 0);
  const gst = calculateGst(subtotal, gstSettingsFor(data.catalogue));
  const quoted = totalWithGst(subtotal, gst);
  if (!Number.isSafeInteger(quoted) || quoted > 100_000_000)
    throw new WorkspaceError("The order total is too large.");
  if (action.advance > quoted)
    throw new WorkspaceError("The advance cannot exceed the order total.");
  const order: Order = {
    ...(gst ? { gst } : {}),
    id: crypto.randomUUID(),
    number: `SG-${Math.max(1000, ...data.orders.map((entry) => Number(entry.number.replace("SG-", "")) || 0)) + 1}`,
    customerId: action.customerId,
    items: action.items.map((item) => {
      const catalogue = catalogueFor(data);
      const garment = catalogue.garments.find(
        (g) => g.active && g.name.toLowerCase() === item.garment.toLowerCase(),
      );
      const workflow = snapshotWorkflow(catalogue, garment);
      return {
        ...item,
        id: crypto.randomUUID(),
        station: workflow?.steps[0].station ?? 0,
        ...(workflow ? { workflow } : {}),
      };
    }),
    priority: action.priority,
    dueDate: action.dueDate,
    notes: action.notes,
    createdAt: timestamp,
    status: "received",
    payments: action.advance
      ? [
          {
            id: crypto.randomUUID(),
            amount: action.advance,
            method: action.method,
            date: timestamp,
          },
        ]
      : [],
  };
  data.orders.unshift(order);
  event(
    order.id,
    "A new order on the books",
    `${order.number} was added to the queue.`,
  );
  return { data, resultId: order.id };
}
