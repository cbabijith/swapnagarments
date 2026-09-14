"use client";

import { useInfiniteFeatureQuery } from "@/shared/hooks/use-infinite-feature-query";
import { workspacePageAdapter } from "@/shared/queries/workspace-pages";
import {
  emptyWorkspace,
  isOpen,
  isOverdue,
  prioritySort,
  shopDate,
  type Workspace,
} from "@/shared/workspace";
import type { OrderRead } from "@/features/orders/types/queries";

export type OrderFilters = { q: string; filter: string; priority: string };

export function selectPreviewOrders(
  workspace: Workspace,
  filters: OrderFilters,
) {
  const today = shopDate(new Date());
  return workspace.orders
    .filter((order) => {
      const customer = workspace.customers.find(
        (entry) => entry.id === order.customerId,
      );
      return (
        `${order.number} ${customer?.name ?? ""} ${customer?.phone ?? ""} ${order.items.map((item) => item.garment)}`
          .toLowerCase()
          .includes(filters.q.trim().toLowerCase()) &&
        (filters.priority === "all" || order.priority === filters.priority) &&
        (filters.filter === "all" ||
          (filters.filter === "due"
            ? order.dueDate === today && isOpen(order)
            : filters.filter === "overdue"
              ? isOverdue(order, today)
              : filters.filter === "active"
                ? isOpen(order)
                : order.status === filters.filter))
      );
    })
    .sort(prioritySort);
}

export function orderSearchParams(filters: OrderFilters) {
  return new URLSearchParams({
    q: filters.q.trim(),
    filter: filters.filter,
    priority: filters.priority,
  });
}

export function useOrderDirectory(filters: OrderFilters & { page: number }) {
  const pageSize = 20;
  const params = orderSearchParams(filters);
  params.set("page", String(filters.page));
  params.set("pageSize", String(pageSize));
  return useInfiniteFeatureQuery<OrderRead>(
    `/api/orders?${params}`,
    (workspace, page) => {
      const matches = selectPreviewOrders(workspace, filters);
      const orders = matches.slice((page - 1) * pageSize, page * pageSize);
      return {
        revision: 0,
        data: {
          ...emptyWorkspace(),
          orders,
          customers: workspace.customers.filter((customer) =>
            orders.some((order) => order.customerId === customer.id),
          ),
        },
        page: {
          page,
          pageSize,
          total: matches.length,
          pageCount: Math.ceil(matches.length / pageSize),
        },
      };
    },
    workspacePageAdapter,
  );
}

export function useOrderDetail(id: string, page = 1) {
  const pageSize = 20;
  return useInfiniteFeatureQuery<OrderRead>(
    `/api/orders/${encodeURIComponent(id)}?page=${page}&pageSize=${pageSize}`,
    (workspace, page) => {
      const orders = workspace.orders.filter((order) => order.id === id);
      const activity = workspace.activity.filter(
        (entry) => entry.orderId === id,
      );
      return {
        revision: 0,
        data: {
          ...emptyWorkspace(),
          orders,
          customers: workspace.customers.filter((customer) =>
            orders.some((order) => order.customerId === customer.id),
          ),
          activity: activity.slice((page - 1) * pageSize, page * pageSize),
        },
        page: {
          page,
          pageSize,
          total: activity.length,
          pageCount: Math.ceil(activity.length / pageSize),
        },
      };
    },
    workspacePageAdapter,
  );
}
