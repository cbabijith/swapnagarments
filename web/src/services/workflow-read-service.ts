import "server-only";
import { and, asc, eq, sql } from "drizzle-orm";
import { orders, customers, orderItems, staff } from "@/db/schema";
import type {
  WorkflowRead,
  WorkflowPiece,
} from "@/features/workflow/types/queries";
import type { PageQuery } from "@/shared/contracts/query-input";
import { isOpen, prioritySort } from "@/shared/workspace";
import {
  withRead,
  openOrder,
  orderSorting,
  pageInfo,
  slicePage,
  offset,
} from "./read-context";

export const readWorkflow = (
  input: PageQuery & { station: "all" | "0" | "1" | "2" | "3" | "4" },
) =>
  withRead(async ({ tx, revision, today, legacy }): Promise<WorkflowRead> => {
    const columns: WorkflowRead["columns"] = [];
    const totals = legacy
      ? []
      : await tx
          .select({
            station: orderItems.station,
            total: sql<number>`count(*)::int`,
          })
          .from(orderItems)
          .innerJoin(orders, eq(orders.id, orderItems.orderId))
          .where(and(openOrder, sql`${orderItems.station}<5`))
          .groupBy(orderItems.station);
    for (let station = 0; station < 5; station++) {
      if (legacy) {
        const pieces = legacy.orders
          .filter(isOpen)
          .sort(prioritySort)
          .flatMap((o) =>
            o.items
              .filter((i) => i.station === station)
              .map((item): WorkflowPiece => ({
                assigneeName: legacy.staff.find(
                  (p) => p.id === item.work?.assigneeId,
                )?.name,
                workStatus: item.work?.status,
                item,
                order: {
                  id: o.id,
                  number: o.number,
                  customerId: o.customerId,
                  priority: o.priority,
                  dueDate: o.dueDate,
                  status: o.status,
                },
                customer: {
                  id: o.customerId,
                  name:
                    legacy.customers.find((c) => c.id === o.customerId)?.name ??
                    "",
                },
              })),
          );
        columns.push({
          station,
          page: pageInfo(input, pieces.length),
          pieces:
            input.station === "all" || Number(input.station) === station
              ? slicePage(pieces, input)
              : [],
        });
        continue;
      }
      const pieces =
        input.station === "all" || Number(input.station) === station
          ? await tx
              .select({
                assigneeName: staff.name,
                workStatus: sql<string | null>`${orderItems.work}->>'status'`,
                measurementsPending: sql<boolean>`coalesce((${orderItems.measurement}->>'confirmed')::boolean = false, false)`,
                item: {
                  id: orderItems.id,
                  garment: orderItems.garment,
                  material: orderItems.material,
                  station: orderItems.station,
                  price: orderItems.price,
                },
                order: {
                  id: orders.id,
                  number: orders.number,
                  customerId: orders.customerId,
                  priority: orders.priority,
                  dueDate: orders.dueDate,
                  status: orders.status,
                },
                customer: { id: customers.id, name: customers.name },
              })
              .from(orderItems)
              .innerJoin(orders, eq(orders.id, orderItems.orderId))
              .innerJoin(customers, eq(customers.id, orders.customerId))
              .leftJoin(
                staff,
                sql`${staff.id}=${orderItems.work}->>'assigneeId'`,
              )
              .where(and(openOrder, eq(orderItems.station, station)))
              .orderBy(
                ...orderSorting,
                asc(orderItems.position),
                asc(orderItems.id),
              )
              .limit(input.pageSize)
              .offset(offset(input))
          : [];
      columns.push({
        station,
        page: pageInfo(
          input,
          Number(totals.find((r) => r.station === station)?.total ?? 0),
        ),
        pieces,
      });
    }
    return { revision, today, columns };
  });
