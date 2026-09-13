import { shopDate, type Workspace } from "@/shared/workspace";
import { parseWorkCode } from "@/features/qr-tags/domain/code";
import { openPieces, safeWorkPiece, unassignedReason } from "./assignment";
import type { WorkQuery } from "../contracts/team";
import type { WorkRead } from "../types/queries";

export function previewWork(
  data: Workspace,
  input: WorkQuery,
  staffId?: string,
): WorkRead {
  const today = shopDate();
  const all = openPieces(data).filter(
    ({ item }) => !staffId || item.work?.assigneeId === staffId,
  );
  const key = input.code ? parseWorkCode(input.code) : null;
  const selected = all.filter(
    ({ order, item }) =>
      (!input.member || item.work?.assigneeId === input.member) &&
      (input.station === "all" || item.station === Number(input.station)) &&
      (input.status === "all" ||
        (input.status === "unassigned"
          ? !item.work?.assigneeId
          : (item.work?.status ?? "pending") === input.status)) &&
      (!input.code ||
        (key &&
          (order.id === key.orderKey ||
            order.number.toLowerCase() === key.orderKey.toLowerCase()) &&
          (!key.pieceId || item.id === key.pieceId))),
  );
  return {
    revision: 0,
    today,
    page: {
      page: input.page,
      pageSize: input.pageSize,
      total: selected.length,
      pageCount: Math.ceil(selected.length / input.pageSize),
    },
    pieces: selected
      .slice((input.page - 1) * input.pageSize, input.page * input.pageSize)
      .map(({ order, item }) => ({
        ...safeWorkPiece(order, item),
        assigneeName: data.staff.find((p) => p.id === item.work?.assigneeId)
          ?.name,
        ...(!item.work?.assigneeId
          ? { unassignedReason: unassignedReason(data, item) }
          : {}),
      })),
    summary: {
      total: all.length,
      pending: all.filter(
        ({ item }) => (item.work?.status ?? "pending") === "pending",
      ).length,
      inProgress: all.filter(({ item }) => item.work?.status === "in_progress")
        .length,
      blocked: all.filter(({ item }) => item.work?.status === "blocked").length,
      unassigned: all.filter(({ item }) => !item.work?.assigneeId).length,
      overdue: all.filter(({ order }) => order.dueDate < today).length,
    },
  };
}
