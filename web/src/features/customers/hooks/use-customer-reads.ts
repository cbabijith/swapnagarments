"use client";

import { useFeatureQuery } from "@/shared/hooks/use-feature-query";
import { emptyWorkspace, prioritySort } from "@/shared/workspace";
import type { CustomerRead } from "@/features/customers/types/queries";
import { matchesCustomer } from "../domain/phone";

export function useCustomerDirectory(query: string, page = 1, pageSize = 20) {
  const params = new URLSearchParams({
    q: query.trim(),
    page: String(page),
    pageSize: String(pageSize),
  });
  return useFeatureQuery<CustomerRead>(
    `/api/customers?${params}`,
    (workspace) => {
      const matches = workspace.customers.filter((customer) =>
        matchesCustomer(customer, query),
      );
      const customers = matches.slice((page - 1) * pageSize, page * pageSize);
      return {
        revision: 0,
        data: { ...emptyWorkspace(), customers },
        page: {
          page,
          pageSize,
          total: matches.length,
          pageCount: Math.ceil(matches.length / pageSize),
        },
        orderCounts: Object.fromEntries(
          customers.map((customer) => [
            customer.id,
            workspace.orders.filter((order) => order.customerId === customer.id)
              .length,
          ]),
        ),
      };
    },
  );
}

export function useCustomerDetail(id: string | null, page = 1) {
  const pageSize = 20;
  return useFeatureQuery<CustomerRead>(
    id
      ? `/api/customers/${encodeURIComponent(id)}?page=${page}&pageSize=${pageSize}`
      : null,
    (workspace) => {
      const customers = workspace.customers.filter(
        (customer) => customer.id === id,
      );
      const orders = workspace.orders
        .filter((order) => order.customerId === id)
        .sort(prioritySort);
      return {
        revision: 0,
        data: {
          ...emptyWorkspace(),
          customers,
          orders: orders.slice((page - 1) * pageSize, page * pageSize),
        },
        page: {
          page,
          pageSize,
          total: orders.length,
          pageCount: Math.ceil(orders.length / pageSize),
        },
        orderCounts: id ? { [id]: orders.length } : {},
      };
    },
  );
}
