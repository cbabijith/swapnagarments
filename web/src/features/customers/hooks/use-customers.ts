"use client";
import { useWorkspace } from "@/shared/compat/workspace-provider";
import type { Customer } from "@/shared/workspace";

export function useCustomers() {
  const workspace = useWorkspace();
  return {
    ...workspace,
    saveCustomer: async (customer: Customer) => {
      await workspace.send(
        { type: "customer.save", customer },
        "Customer details saved.",
      );
    },
  };
}
