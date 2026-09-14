import type { Order, OrderItem } from "@/features/orders/types";
import type { WorkCompletionSnapshot } from "../types/work-history";

/** Save only the task details that were visible to the assigned worker. */
export function completionSnapshot(
  order: Order,
  piece: OrderItem,
): WorkCompletionSnapshot {
  const measurement = piece.measurement;
  return structuredClone({
    material: piece.material,
    priority: order.priority,
    dueDate: order.dueDate,
    ...(piece.work?.assignedAt ? { assignedAt: piece.work.assignedAt } : {}),
    ...(piece.work?.startedAt ? { startedAt: piece.work.startedAt } : {}),
    ...(piece.design ? { design: piece.design } : {}),
    ...(measurement
      ? {
          measurement: {
            unit: measurement.unit,
            fields: measurement.fields,
            values: measurement.values,
            confirmed: measurement.confirmed,
            ...(measurement.image ? { image: measurement.image } : {}),
          },
        }
      : {}),
  });
}
