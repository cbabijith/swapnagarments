import type { Order } from "./order";

/**
 * Persistence port for orders. Infrastructure provides the implementation
 * (in-memory today; PostgreSQL + Prisma is the expected next step).
 */
export interface OrderRepository {
  save(order: Order): Promise<void>;
  findById(id: string): Promise<Order | null>;
  findAll(): Promise<Order[]>;
}
