import {
  mutationSchema,
  type WorkspaceMutation,
} from "@/shared/contracts/command";
import { WorkspaceError } from "@/shared/errors";
import { shopDate, type Workspace } from "@/shared/workspace";
import { saveCustomer } from "@/features/customers/domain/saveCustomer";
import { createOrder } from "@/features/orders/domain/createOrder";
import { deliverOrder } from "@/features/orders/domain/deliverOrder";
import { recordPayment } from "@/features/billing/domain/recordPayment";
import { changePiece } from "@/features/workflow/domain/changePiece";
import { closeDay } from "@/features/reports/domain/closeDay";
export { mutationSchema, type WorkspaceMutation, WorkspaceError };

/** Compatibility dispatcher. Rules belong to feature domain functions. */
export function applyMutation(
  current: Workspace,
  input: unknown,
  actor: string,
  now = new Date(),
): { data: Workspace; resultId?: string } {
  const parsed = mutationSchema.safeParse(input);
  if (!parsed.success)
    throw new WorkspaceError(
      parsed.error.issues[0]?.message ?? "Invalid update.",
    );
  const action = parsed.data;
  const data = structuredClone(current);
  const timestamp = now.toISOString();
  const context = {
    data,
    actor,
    timestamp,
    today: shopDate(now),
    event: (orderId: string, title: string, detail: string) => {
      data.activity.unshift({
        id: crypto.randomUUID(),
        orderId,
        title,
        detail,
        time: timestamp,
        actor,
      });
    },
  };
  switch (action.type) {
    case "customer.save":
      return saveCustomer({ ...context, action });
    case "order.create":
      return createOrder({ ...context, action });
    case "order.deliver":
      return deliverOrder({ ...context, action });
    case "payment.record":
      return recordPayment({ ...context, action });
    case "piece.advance":
    case "piece.rework":
      return changePiece({ ...context, action });
    case "day.close":
      return closeDay({ ...context, action });
  }
}
