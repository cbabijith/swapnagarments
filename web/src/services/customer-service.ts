import "server-only";
import { saveCustomer } from "@/features/customers/domain/saveCustomer";
import type { MutationContext } from "@/shared/domain/mutation-context";

export function customerService(context: MutationContext<"customer.save">) {
  return saveCustomer(context);
}
