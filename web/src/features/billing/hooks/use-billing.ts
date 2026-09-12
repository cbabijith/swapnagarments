"use client";
import { useWorkspace } from "@/shared/compat/workspace-provider";

export function useBilling() {
  const workspace = useWorkspace();
  return {
    ...workspace,
    recordPayment: async (orderId: string, amount: number, method: string) => {
      await workspace.send(
        { type: "payment.record", orderId, amount, method },
        "Payment saved.",
      );
    },
  };
}
