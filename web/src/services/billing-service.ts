import "server-only";
import { recordPayment } from "@/features/billing/domain/recordPayment";
import { applyGst } from "@/features/billing/domain/applyGst";
import type { MutationContext } from "@/shared/domain/mutation-context";

export function billingService(
  context: MutationContext<"payment.record" | "billing.apply-gst">,
) {
  return context.action.type === "billing.apply-gst"
    ? applyGst({ ...context, action: context.action })
    : recordPayment({ ...context, action: context.action });
}
