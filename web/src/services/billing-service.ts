import "server-only";
import { recordPayment } from "@/features/billing/domain/recordPayment";
import type { MutationContext } from "@/shared/domain/mutation-context";

export function billingService(context: MutationContext<"payment.record">) {
  return recordPayment(context);
}
