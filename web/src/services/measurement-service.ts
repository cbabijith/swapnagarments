import "server-only";
import {
  saveProfile,
  savePieceMeasurements,
} from "@/features/measurements/domain/saveProfile";
import type { MutationContext } from "@/shared/domain/mutation-context";
export function measurementService(
  context: MutationContext<"measurement.save" | "piece.measurements">,
) {
  return context.action.type === "measurement.save"
    ? saveProfile({ ...context, action: context.action })
    : savePieceMeasurements({ ...context, action: context.action });
}
