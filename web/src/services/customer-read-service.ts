import "server-only";
import { asc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { customers, orders } from "@/db/schema";
import type { CustomerRead } from "@/features/customers/types/queries";
import type { PageQuery } from "@/shared/contracts/query-input";
import { emptyWorkspace, prioritySort } from "@/shared/workspace";
import { WorkspaceError } from "@/shared/errors";
import {
  withRead,
  countRows,
  hydrateCustomers,
  hydrateOrders,
  pageInfo,
  slicePage,
  offset,
  literalPattern,
  orderSorting,
  legacyOrders,
} from "./read-context";

export const readCustomers = (input: PageQuery & { q: string }) =>
  withRead(async ({ tx, revision, legacy }): Promise<CustomerRead> => {
    const data = emptyWorkspace();
    if (legacy) {
      const rows = legacy.customers.filter((c) =>
        `${c.name} ${c.phone}`.toLowerCase().includes(input.q.toLowerCase()),
      );
      data.customers = slicePage(rows, input).map(
        ({ measurementHistory: _history, ...customer }) => {
          void _history;
          return customer;
        },
      );
      return {
        revision,
        data,
        page: pageInfo(input, rows.length),
        orderCounts: Object.fromEntries(
          data.customers.map((c) => [
            c.id,
            legacy.orders.filter((o) => o.customerId === c.id).length,
          ]),
        ),
      };
    }
    const pattern = literalPattern(input.q),
      where = input.q
        ? or(ilike(customers.name, pattern), ilike(customers.phone, pattern))
        : undefined;
    const count = await countRows(tx, customers, where);
    const rows = await tx
      .select()
      .from(customers)
      .where(where)
      .orderBy(asc(customers.position), asc(customers.id))
      .limit(input.pageSize)
      .offset(offset(input));
    data.customers = hydrateCustomers(rows);
    const counts = rows.length
      ? await tx
          .select({ id: orders.customerId, total: sql<number>`count(*)::int` })
          .from(orders)
          .where(
            inArray(
              orders.customerId,
              rows.map((c) => c.id),
            ),
          )
          .groupBy(orders.customerId)
      : [];
    return {
      revision,
      data,
      page: pageInfo(input, count),
      orderCounts: Object.fromEntries(
        data.customers.map((c) => [
          c.id,
          Number(counts.find((r) => r.id === c.id)?.total ?? 0),
        ]),
      ),
    };
  });
export const readCustomer = (id: string, input: PageQuery) =>
  withRead(async ({ tx, revision, legacy }): Promise<CustomerRead> => {
    if (legacy) {
      const customer = legacy.customers.find((c) => c.id === id);
      if (!customer) throw new WorkspaceError("Customer not found.", 404);
      const rows = legacy.orders
          .filter((o) => o.customerId === id)
          .sort(prioritySort),
        data = legacyOrders(legacy, slicePage(rows, input));
      const { measurementHistory: _history, ...current } = customer;
      void _history;
      data.customers = [current];
      return {
        revision,
        data,
        page: pageInfo(input, rows.length),
        orderCounts: { [id]: rows.length },
      };
    }
    const customerRows = await tx
      .select()
      .from(customers)
      .where(eq(customers.id, id))
      .limit(1);
    if (!customerRows.length)
      throw new WorkspaceError("Customer not found.", 404);
    const where = eq(orders.customerId, id),
      count = await countRows(tx, orders, where);
    const rows = await tx
      .select()
      .from(orders)
      .where(where)
      .orderBy(...orderSorting)
      .limit(input.pageSize)
      .offset(offset(input));
    const data = await hydrateOrders(tx, rows);
    data.customers = hydrateCustomers(customerRows);
    return {
      revision,
      data,
      page: pageInfo(input, count),
      orderCounts: { [id]: count },
    };
  });
