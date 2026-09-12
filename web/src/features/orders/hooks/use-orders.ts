"use client";
import { useWorkspace } from "@/shared/compat/workspace-provider";
import type { OrderItem, Priority } from "@/shared/workspace";

type NewOrder = {
  customerId: string;
  items: Omit<OrderItem, "id" | "station">[];
  priority: Priority;
  dueDate: string;
  notes: string;
  advance: number;
  method: string;
};
export function useOrders() {
  const workspace = useWorkspace();
  return {
    ...workspace,
    createOrder: async (input: NewOrder) => {
      const result = await workspace.send(
        { type: "order.create", ...input },
        "Order saved.",
      );
      if (!result.resultId)
        throw new Error("The new order could not be loaded.");
      return { id: result.resultId };
    },
    deliver: async (orderId: string) => {
      await workspace.send(
        { type: "order.deliver", orderId },
        "Order marked delivered.",
      );
    },
  };
}
