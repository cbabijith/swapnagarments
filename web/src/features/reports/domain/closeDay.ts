import { type Workspace, shopDate, balance, isOpen } from "@/shared/workspace";
import { WorkspaceError } from "@/shared/errors";
import type { MutationContext } from "@/shared/domain/mutation-context";

export function closeDay({
  data,
  action,
  actor,
  timestamp,
  today,
}: MutationContext<"day.close">): { data: Workspace; resultId?: string } {
  if (action.date !== today)
    throw new WorkspaceError("Only today’s report can be closed.");
  if (data.closedDays.includes(today))
    throw new WorkspaceError("This day has already been reviewed.", 409);
  data.closedDays.push(today);
  data.dayReports = [
    ...(data.dayReports ?? []),
    {
      date: today,
      reviewedBy: actor,
      reviewedAt: timestamp,
      delivered: data.orders.filter(
        (order) =>
          order.deliveredAt && shopDate(new Date(order.deliveredAt)) === today,
      ).length,
      ready: data.orders.filter((order) => order.status === "ready").length,
      unfinished: data.orders.filter(
        (order) =>
          isOpen(order) && order.status !== "ready" && order.dueDate <= today,
      ).length,
      collected: data.orders
        .flatMap((order) => order.payments)
        .filter((payment) => shopDate(new Date(payment.date)) === today)
        .reduce((sum, payment) => sum + payment.amount, 0),
      pending: data.orders
        .filter((order) => order.status !== "cancelled")
        .reduce((sum, order) => sum + balance(order), 0),
    },
  ];
  return { data };
}
