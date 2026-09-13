import "server-only";
import { and, asc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { staff, orders, orderItems, assignmentSettings } from "@/db/schema";
import {
  defaultAssignmentSettings,
  eligible,
  workloads,
} from "@/features/team/domain/assignment";
import { previewWork } from "@/features/team/domain/queries";
import type {
  WorkQuery,
  SessionUser,
  AssignmentSettings,
} from "@/features/team/contracts/team";
import type { TeamRead, WorkRead } from "@/features/team/types/queries";
import { emptyWorkspace } from "@/shared/workspace";
import { WorkspaceError } from "@/shared/errors";
import { parseWorkCode } from "@/features/qr-tags/domain/code";
import {
  withRead,
  pageInfo,
  offset,
  slicePage,
  orderSorting,
  openOrder,
  literalPattern,
  type ReadContext,
} from "./read-context";
import type { TeamQuery } from "@/features/team/contracts/query";

async function settingsFor({
  tx,
  legacy,
}: ReadContext): Promise<AssignmentSettings> {
  if (legacy) return legacy.assignmentSettings ?? defaultAssignmentSettings();
  const [row] = await tx
    .select()
    .from(assignmentSettings)
    .where(eq(assignmentSettings.workspaceId, 1));
  return row?.settings ?? defaultAssignmentSettings();
}
export const readTeamMembers = (input: TeamQuery) =>
  withRead(async (context): Promise<TeamRead> => {
    const { tx, revision, legacy } = context;
    const settings = await settingsFor(context);
    if (legacy) {
      const filtered = legacy.staff.filter(
        (p) =>
          p.name.toLowerCase().includes(input.q.toLowerCase()) &&
          (input.eligibleStation === undefined ||
            eligible(p, Number(input.eligibleStation))),
      );
      const selected = slicePage(filtered, input);
      return {
        revision,
        data: { ...emptyWorkspace(), staff: selected },
        settings,
        loads: Object.fromEntries(
          [...workloads(legacy)].filter(([id]) =>
            selected.some((p) => p.id === id),
          ),
        ),
        page: pageInfo(input, filtered.length),
      };
    }
    const where = and(
      ilike(staff.name, literalPattern(input.q)),
      input.eligibleStation === undefined
        ? undefined
        : sql`${staff.worker}->>'active' = 'true' AND ${staff.worker}->>'available' = 'true' AND (${staff.worker}->'skills') @> ${JSON.stringify([Number(input.eligibleStation)])}::jsonb`,
    );
    const [count] = await tx
      .select({ total: sql<number>`count(*)::int` })
      .from(staff)
      .where(where);
    const people = await tx
      .select()
      .from(staff)
      .where(where)
      .orderBy(asc(staff.position), asc(staff.id))
      .limit(input.pageSize)
      .offset(offset(input));
    const loads: TeamRead["loads"] = {};
    if (people.length) {
      const assignee = sql<string>`${orderItems.work}->>'assigneeId'`;
      const loadRows = await tx
        .select({
          id: assignee,
          pieces: sql<number>`count(*)::int`,
          minutes: sql<number>`coalesce(sum((${JSON.stringify(settings.stationMinutes)}::jsonb->>${orderItems.station})::int),0)::int`,
          inProgress: sql<number>`count(*) filter (where ${orderItems.work}->>'status'='in_progress')::int`,
          blocked: sql<number>`count(*) filter (where ${orderItems.work}->>'status'='blocked')::int`,
        })
        .from(orderItems)
        .innerJoin(orders, eq(orders.id, orderItems.orderId))
        .where(
          and(
            openOrder,
            sql`${orderItems.station}<5`,
            inArray(
              assignee,
              people.map((p) => p.id),
            ),
          ),
        )
        .groupBy(assignee);
      for (const load of loadRows)
        loads[load.id] = {
          pieces: load.pieces,
          minutes: load.minutes,
          inProgress: load.inProgress,
          blocked: load.blocked,
        };
    }
    return {
      revision,
      data: {
        ...emptyWorkspace(),
        staff: people.map((p) => ({
          id: p.id,
          name: p.name,
          role: p.role,
          station: p.station,
          color: p.color,
          ...(p.worker ? { worker: p.worker } : {}),
        })),
      },
      settings,
      loads,
      page: pageInfo(input, count.total),
    };
  });

export const readWork = (input: WorkQuery, user: SessionUser) =>
  withRead(async (context): Promise<WorkRead> => {
    const { tx, revision, today, legacy } = context;
    const staffId = user.role === "worker" ? user.staffId : undefined;
    if (
      user.role === "worker" &&
      (!staffId || (input.member && input.member !== staffId))
    )
      throw new WorkspaceError("You can only view your own work.", 403);
    const key = input.code ? parseWorkCode(input.code) : null;
    if (input.code && !key)
      throw new WorkspaceError(
        "Scan a Swapna garment label or enter its printed order number.",
      );
    if (legacy) return { ...previewWork(legacy, input, staffId), revision };
    const base = and(
      openOrder,
      sql`${orderItems.station}<5`,
      staffId ? sql`${orderItems.work}->>'assigneeId'=${staffId}` : undefined,
    );
    const where = and(
      base,
      input.member
        ? sql`${orderItems.work}->>'assigneeId'=${input.member}`
        : undefined,
      input.station !== "all"
        ? eq(orderItems.station, Number(input.station))
        : undefined,
      input.status === "all"
        ? undefined
        : input.status === "unassigned"
          ? sql`${orderItems.work}->>'assigneeId' IS NULL`
          : sql`coalesce(${orderItems.work}->>'status','pending')=${input.status}`,
      key
        ? and(
            or(
              eq(orders.id, key.orderKey),
              sql`lower(${orders.number})=${key.orderKey.toLowerCase()}`,
            ),
            key.pieceId ? eq(orderItems.id, key.pieceId) : undefined,
          )
        : undefined,
    );
    const [summary] = await tx
      .select({
        total: sql<number>`count(*)::int`,
        pending: sql<number>`count(*) filter(where coalesce(${orderItems.work}->>'status','pending')='pending')::int`,
        inProgress: sql<number>`count(*) filter(where ${orderItems.work}->>'status'='in_progress')::int`,
        blocked: sql<number>`count(*) filter(where ${orderItems.work}->>'status'='blocked')::int`,
        unassigned: sql<number>`count(*) filter(where ${orderItems.work}->>'assigneeId' IS NULL)::int`,
        overdue: sql<number>`count(*) filter(where ${orders.dueDate}<${today})::int`,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .where(base);
    const [count] = await tx
      .select({ total: sql<number>`count(*)::int` })
      .from(orderItems)
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .where(where);
    const rows = await tx
      .select({
        order: {
          id: orders.id,
          number: orders.number,
          priority: orders.priority,
          dueDate: orders.dueDate,
        },
        item: {
          id: orderItems.id,
          garment: orderItems.garment,
          material: orderItems.material,
          station: orderItems.station,
          work: orderItems.work,
          measurement: orderItems.measurement,
          design: orderItems.design,
        },
        assigneeName: staff.name,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .leftJoin(staff, sql`${staff.id}=${orderItems.work}->>'assigneeId'`)
      .where(where)
      .orderBy(...orderSorting, asc(orderItems.position), asc(orderItems.id))
      .limit(input.pageSize)
      .offset(offset(input));
    const reasons = new Map<number, string>();
    if (!staffId && rows.some((r) => !r.item.work?.assigneeId)) {
      const settings = await settingsFor(context);
      for (const station of new Set(
        rows.filter((r) => !r.item.work?.assigneeId).map((r) => r.item.station),
      )) {
        const qualified = sql`${staff.worker}->>'active'='true' AND ${staff.worker}->>'available'='true' AND (${staff.worker}->'skills') @> ${JSON.stringify([station])}::jsonb`;
        const room = sql`coalesce((SELECT sum((${JSON.stringify(settings.stationMinutes)}::jsonb->>i.station)::int) FROM sg_order_items i JOIN sg_orders o ON o.id=i.order_id WHERE i.station<5 AND o.status NOT IN ('delivered','cancelled') AND i.work->>'assigneeId'=${staff.id}),0)+${settings.stationMinutes[station]} <= (${staff.worker}->>'capacityMinutes')::int`;
        const [coverage] = await tx
          .select({
            eligible: sql<number>`count(*)::int`,
            withRoom: sql<number>`count(*) filter(where ${room})::int`,
          })
          .from(staff)
          .where(qualified);
        reasons.set(
          station,
          !coverage.eligible
            ? "No available worker has this station skill"
            : settings.respectCapacity && !coverage.withRoom
              ? "Eligible workers are at capacity"
              : "Choose a worker or distribute waiting work",
        );
      }
    }
    return {
      revision,
      today,
      summary,
      page: pageInfo(input, count.total),
      pieces: rows.map((r) => ({
        order: r.order,
        item: {
          ...r.item,
          work: r.item.work ?? undefined,
          measurement: r.item.measurement ?? undefined,
          design: r.item.design ?? undefined,
        },
        assigneeName: r.assigneeName ?? undefined,
        ...(!r.item.work?.assigneeId
          ? {
              unassignedReason:
                r.item.measurement?.confirmed === false
                  ? "Measurements need confirmation"
                  : r.item.work?.manual
                    ? "Held for manual assignment"
                    : (reasons.get(r.item.station) ??
                      "Choose a qualified worker"),
            }
          : {}),
      })),
    };
  });
