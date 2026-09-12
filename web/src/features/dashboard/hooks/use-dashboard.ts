"use client";

import { useFeatureQuery } from "@/shared/hooks/use-feature-query";
import {
  emptyWorkspace,
  isOpen,
  isOverdue,
  prioritySort,
  shopDate,
  STATIONS,
} from "@/shared/workspace";
import type { DashboardRead } from "@/features/dashboard/types/queries";

export function useDashboard(
  taskFilter: "due" | "urgent" | "ready",
  enabled = true,
) {
  return useFeatureQuery<DashboardRead>(
    enabled ? `/api/dashboard?taskFilter=${taskFilter}` : null,
    (workspace) => {
      const today = shopDate();
      const open = workspace.orders.filter(isOpen);
      const ready = open.filter((order) => order.status === "ready");
      const todayOrders = workspace.orders.filter(
        (order) => order.dueDate === today && order.status !== "cancelled",
      );
      const tasks = (
        taskFilter === "ready"
          ? ready
          : taskFilter === "urgent"
            ? open.filter((order) => order.priority === "urgent")
            : open.filter((order) => order.dueDate <= today)
      ).sort(prioritySort);
      const orders = tasks.slice(0, 5);
      return {
        revision: 0,
        today,
        page: {
          page: 1,
          pageSize: 5,
          total: tasks.length,
          pageCount: Math.max(1, Math.ceil(tasks.length / 5)),
        },
        data: {
          ...emptyWorkspace(),
          orders,
          customers: workspace.customers.filter((customer) =>
            orders.some((order) => order.customerId === customer.id),
          ),
          activity: workspace.activity.slice(0, 3),
        },
        summary: {
          open: open.length,
          due: open.filter((order) => order.dueDate === today).length,
          overdue: open.filter((order) => isOverdue(order, today)).length,
          inProgress: open.filter((order) => order.status === "in_progress")
            .length,
          ready: ready.length,
          collectedToday: workspace.orders
            .flatMap((order) => order.payments)
            .filter((payment) => shopDate(new Date(payment.date)) === today)
            .reduce((sum, payment) => sum + payment.amount, 0),
          deliveredToday: workspace.orders.filter(
            (order) =>
              order.deliveredAt &&
              shopDate(new Date(order.deliveredAt)) === today,
          ).length,
          unfinished: open.filter(
            (order) => order.dueDate <= today && order.status !== "ready",
          ).length,
          todayTotal: todayOrders.length,
          todayFinished: todayOrders.filter((order) =>
            ["ready", "delivered"].includes(order.status),
          ).length,
          reviewed: workspace.closedDays.includes(today),
          stations: STATIONS.map(
            (_, index) =>
              open
                .flatMap((order) => order.items)
                .filter((item) => item.station === index).length,
          ),
        },
      };
    },
  );
}
