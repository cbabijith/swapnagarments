import "server-only";
import { closeDay } from "@/features/reports/domain/closeDay";
import type { MutationContext } from "@/shared/domain/mutation-context";

export function reportService(context: MutationContext<"day.close">) {
  return closeDay(context);
}
