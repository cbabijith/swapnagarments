import "server-only";
import { createOrder } from "@/features/orders/domain/createOrder";
import { deliverOrder } from "@/features/orders/domain/deliverOrder";
import type { MutationContext } from "@/shared/domain/mutation-context";

export function orderService(
  context: MutationContext<"order.create" | "order.deliver">,
) {
  return context.action.type === "order.create"
    ? createOrder({ ...context, action: context.action })
    : deliverOrder({ ...context, action: context.action });
}
