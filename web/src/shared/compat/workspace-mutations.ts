import type { AssetMap } from "@/features/design-library/domain/designs";
import { teamCommand } from "@/features/team/domain/commands";
import { distribute } from "@/features/team/domain/assignment";
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
import { saveCatalogue } from "@/features/settings/domain/saveCatalogue";
import { createIntake } from "@/features/orders/domain/createIntake";
import {
  saveProfile,
  savePieceMeasurements,
} from "@/features/measurements/domain/saveProfile";
export { mutationSchema, type WorkspaceMutation, WorkspaceError };

/** Compatibility dispatcher. Rules belong to feature domain functions. */
export function applyMutation(
  current: Workspace,
  input: unknown,
  actor: string,
  now = new Date(),
  assets?: AssetMap,
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
    assets,
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
  const result = (() => {
    switch (action.type) {
      case "team.save":
      case "team.settings":
      case "team.distribute":
      case "work.assign":
      case "work.update":
        return teamCommand({ ...context, action });
      case "settings.save":
        return saveCatalogue({ ...context, action });
      case "order.intake":
        return createIntake({ ...context, action });
      case "measurement.save":
        return saveProfile({ ...context, action });
      case "piece.measurements":
        return savePieceMeasurements({ ...context, action });
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
  })();
  if (result.data.assignmentSettings?.automatic)
    distribute(result.data, timestamp, context.event);
  return result;
}
