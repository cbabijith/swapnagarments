import { balance, isOpen, money, total } from "@/shared/workspace";
import { WorkspaceError } from "@/shared/errors";
import type { MutationContext } from "@/shared/domain/mutation-context";
import { assertGstSettings, calculateGst, gstSettingsFor } from "./gst";

export function applyGst({
  data,
  action,
  event,
}: MutationContext<"billing.apply-gst">) {
  const order = data.orders.find((entry) => entry.id === action.orderId);
  if (!order) throw new WorkspaceError("Order not found.", 404);
  if (!isOpen(order) || balance(order) <= 0)
    throw new WorkspaceError(
      "GST can only be applied to an open order with an unpaid balance.",
      409,
    );
  if (order.gst)
    throw new WorkspaceError(
      "GST is already saved on this order. Reload to see its bill.",
      409,
    );
  const settings = gstSettingsFor(data.catalogue);
  assertGstSettings(settings, action.settings);
  if (!settings.enabled)
    throw new WorkspaceError("Enable GST in Settings first.", 409);
  order.gst = calculateGst(total(order), settings);
  if (total(order) > 100_000_000)
    throw new WorkspaceError("The order total including GST is too large.");
  event(
    order.id,
    "GST applied",
    `${order.number} · GST ${settings.rateBps / 100}% · Total ${money(total(order))}`,
  );
  return { data, resultId: order.id };
}
