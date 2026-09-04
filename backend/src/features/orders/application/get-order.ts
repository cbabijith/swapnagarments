import { NotFoundError } from "@/core/errors/app-errors";
import type { Order } from "../domain/order";
import type { OrderUseCaseDeps } from "./deps";

export class GetOrderUseCase {
  constructor(private readonly deps: OrderUseCaseDeps) {}

  async run(id: string): Promise<Order> {
    const order = await this.deps.orders.findById(id);
    if (!order) {
      throw new NotFoundError("Order", id);
    }
    return order;
  }
}
