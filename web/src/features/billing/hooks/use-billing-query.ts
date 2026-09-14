"use client";

import { useInfiniteFeatureQuery } from "@/shared/hooks/use-infinite-feature-query";
import { workspacePageAdapter } from "@/shared/queries/workspace-pages";
import { emptyWorkspace, balance, paid } from "@/shared/workspace";
import type { BillingRead } from "@/features/billing/types/queries";

export function useBillingQuery(filter: string, page: number) {
  const pageSize = 20;
  return useInfiniteFeatureQuery<BillingRead>(
    `/api/billing?filter=${filter}&page=${page}&pageSize=${pageSize}`,
    (workspace, page) => {
      const matches = workspace.orders.filter(
        (order) =>
          order.status !== "cancelled" &&
          (filter === "all" ||
            (filter === "pending" ? balance(order) > 0 : balance(order) === 0)),
      );
      const orders = matches.slice((page - 1) * pageSize, page * pageSize);
      return {
        revision: 0,
        page: {
          page,
          pageSize,
          total: matches.length,
          pageCount: Math.max(1, Math.ceil(matches.length / pageSize)),
        },
        data: {
          ...emptyWorkspace(),
          orders,
          customers: workspace.customers.filter((customer) =>
            orders.some((order) => order.customerId === customer.id),
          ),
        },
        totals: {
          pending: workspace.orders
            .filter((order) => order.status !== "cancelled")
            .reduce((sum, order) => sum + balance(order), 0),
          collected: workspace.orders.reduce(
            (sum, order) => sum + paid(order),
            0,
          ),
        },
      };
    },
    workspacePageAdapter,
  );
}
