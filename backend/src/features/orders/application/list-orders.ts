import type { Order } from "../domain/order";
import type { ListOrdersDto } from "./order-schemas";
import type { OrderUseCaseDeps } from "./deps";

export class ListOrdersUseCase {
  constructor(private readonly deps: OrderUseCaseDeps) {}

  async run(filter: ListOrdersDto = {}): Promise<Order[]> {
    const orders = await this.deps.orders.findAll();
    return orders.filter(
      (order) =>
        (!filter.status || order.status === filter.status) &&
        (!filter.priority || order.priority === filter.priority),
    );
  }
}
