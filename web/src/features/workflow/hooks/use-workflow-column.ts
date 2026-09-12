"use client";

import { useFeatureQuery } from "@/shared/hooks/use-feature-query";
import { isOpen, prioritySort, shopDate } from "@/shared/workspace";
import type { WorkflowRead } from "@/features/workflow/types/queries";

export function useWorkflowColumn(station: number, page: number) {
  const pageSize = 20;
  return useFeatureQuery<WorkflowRead>(
    `/api/workflow?station=${station}&page=${page}&pageSize=${pageSize}`,
    (workspace) => {
      const pieces = workspace.orders
        .filter(isOpen)
        .sort(prioritySort)
        .flatMap((order) =>
          order.items
            .filter((item) => item.station === station)
            .map((item) => ({
              item,
              order,
              customer: {
                id: order.customerId,
                name:
                  workspace.customers.find(
                    (customer) => customer.id === order.customerId,
                  )?.name ?? "Customer",
              },
            })),
        );
      return {
        revision: 0,
        today: shopDate(),
        columns: [
          {
            station,
            page: {
              page,
              pageSize,
              total: pieces.length,
              pageCount: Math.max(1, Math.ceil(pieces.length / pageSize)),
            },
            pieces: pieces.slice((page - 1) * pageSize, page * pageSize),
          },
        ],
      };
    },
  );
}
