import type { PageInfo } from "@/shared/contracts/query";
import type { Customer, Order, OrderItem } from "@/shared/workspace";
export type WorkflowPiece = {
  item: OrderItem;
  order: Pick<
    Order,
    "id" | "number" | "customerId" | "priority" | "dueDate" | "status"
  >;
  customer: Pick<Customer, "id" | "name">;
};
export type WorkflowRead = {
  revision: number;
  today: string;
  columns: { station: number; page: PageInfo; pieces: WorkflowPiece[] }[];
};
