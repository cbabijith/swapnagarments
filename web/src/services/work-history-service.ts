import "server-only";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import type { DatabaseTransaction } from "@/db";
import { workCompletions } from "@/db/schema";
import type { WorkspaceMutation } from "@/shared/contracts/command";
import type { Workspace } from "@/shared/workspace";
import type { SessionUser } from "@/features/team/contracts/team";
import type { WorkHistoryQuery } from "@/features/team/contracts/work-history";
import type { WorkHistoryRead } from "@/features/team/types/work-history";
import { currentStepName } from "@/features/workflow/domain/templates";
import { WorkspaceError } from "@/shared/errors";
import { withRead, literalPattern, offset, pageInfo } from "./read-context";

/** Run after a successful transition, in the same transaction as its retry receipt. */
export async function recordWorkCompletion(
  tx: DatabaseTransaction,
  action: WorkspaceMutation,
  before: Workspace,
  mutationId: string,
  completedAt: string,
) {
  if (
    action.type !== "piece.advance" &&
    !(action.type === "work.update" && action.operation === "complete")
  )
    return;
  const order = before.orders.find((entry) => entry.id === action.orderId);
  const piece = order?.items.find((entry) => entry.id === action.pieceId);
  if (!order || !piece || !piece.work?.assigneeId || piece.station >= 5) return;
  await tx.insert(workCompletions).values({
    id: crypto.randomUUID(),
    mutationId,
    workerId: piece.work.assigneeId,
    orderId: order.id,
    orderNumber: order.number,
    pieceId: piece.id,
    garment: piece.garment,
    station: piece.station,
    stepName: currentStepName(piece),
    completedAt,
  });
}

export function readWorkHistory(input: WorkHistoryQuery, user: SessionUser) {
  if (user.role !== "worker" || !user.staffId)
    throw new WorkspaceError(
      "Sign in with a worker account to view your work history.",
      403,
    );
  const workerId = user.staffId;
  return withRead(async ({ tx, revision }): Promise<WorkHistoryRead> => {
    const where = and(
      eq(workCompletions.workerId, workerId),
      input.station === "all"
        ? undefined
        : eq(workCompletions.station, Number(input.station)),
      input.q
        ? or(
            ilike(workCompletions.orderNumber, literalPattern(input.q)),
            ilike(workCompletions.garment, literalPattern(input.q)),
            ilike(workCompletions.stepName, literalPattern(input.q)),
          )
        : undefined,
    );
    const [count] = await tx
      .select({ total: sql<number>`count(*)::int` })
      .from(workCompletions)
      .where(where);
    const entries = await tx
      .select({
        id: workCompletions.id,
        orderNumber: workCompletions.orderNumber,
        pieceId: workCompletions.pieceId,
        garment: workCompletions.garment,
        station: workCompletions.station,
        stepName: workCompletions.stepName,
        completedAt: workCompletions.completedAt,
      })
      .from(workCompletions)
      .where(where)
      .orderBy(desc(workCompletions.completedAt), desc(workCompletions.id))
      .limit(input.pageSize)
      .offset(offset(input));
    return { revision, entries, page: pageInfo(input, count.total) };
  });
}
