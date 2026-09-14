"use client";

import { useInfiniteFeatureQuery } from "@/shared/hooks/use-infinite-feature-query";
import { uniqueRecords } from "@/shared/queries/infinite-pages";
import { isOpen, prioritySort, shopDate } from "@/shared/workspace";
import type { WorkflowRead } from "@/features/workflow/types/queries";

export function useWorkflowColumn(station: number, page: number) {
  const pageSize = 20;
  return useInfiniteFeatureQuery<WorkflowRead>(
    `/api/workflow?station=${station}&page=${page}&pageSize=${pageSize}`,
    (workspace, page) => {
      const pieces = workspace.orders
        .filter(isOpen)
        .sort(prioritySort)
        .flatMap((order) =>
          order.items
            .filter((item) => item.station === station)
            .map((item) => ({
              assigneeName: workspace.staff.find(
                (p) => p.id === item.work?.assigneeId,
              )?.name,
              workStatus: item.work?.status,
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
    workflowPageAdapter,
  );
}

const workflowPageAdapter = {
  page: (data: WorkflowRead) => data.columns[0].page,
  merge: (pages: WorkflowRead[]): WorkflowRead => {
    const latest = pages[pages.length - 1];
    return {
      ...latest,
      columns: latest.columns.map((column) => ({
        ...column,
        pieces: uniqueRecords(
          pages.flatMap(
            (page) =>
              page.columns.find((entry) => entry.station === column.station)
                ?.pieces ?? [],
          ),
          (piece) => piece.item.id,
        ),
      })),
    };
  },
};
