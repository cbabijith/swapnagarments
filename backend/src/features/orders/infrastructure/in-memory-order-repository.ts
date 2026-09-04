import type { Order } from "../domain/order";
import type { OrderRepository } from "../domain/order-repository";

const globalForDev = globalThis as unknown as { __sgInMemoryOrders?: Map<string, Order> };

/** In-memory implementation used until the database decision is made. */
export class InMemoryOrderRepository implements OrderRepository {
  private readonly store: Map<string, Order>;

  constructor() {
    // Cached on globalThis so Next.js dev-mode module reloads keep the data.
    this.store = (globalForDev.__sgInMemoryOrders ??= new Map());
  }

  async save(order: Order): Promise<void> {
    this.store.set(order.id, structuredClone(order));
  }

  async findById(id: string): Promise<Order | null> {
    const order = this.store.get(id);
    return order ? structuredClone(order) : null;
  }

  async findAll(): Promise<Order[]> {
    return [...this.store.values()]
      .map((order) => structuredClone(order))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}
