import "server-only";
import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import type { DatabaseTransaction } from "@/db";
import { owners, workerAccounts, workerSessions } from "@/db/schema";
import { hashPassword } from "@/shared/server/crypto";
import { WorkspaceError } from "@/shared/errors";
import type { WorkspaceMutation } from "@/shared/contracts/command";
import type { SessionUser } from "@/features/team/contracts/team";
import type { Workspace } from "@/shared/workspace";
export { teamCommand as teamService } from "@/features/team/domain/commands";
export { distribute as distributeWork } from "@/features/team/domain/assignment";

export function authorizeWorkCommand(
  data: Workspace,
  action: WorkspaceMutation,
  user: SessionUser,
) {
  if (user.role !== "worker") return;
  if (action.type !== "work.update")
    throw new WorkspaceError("Only the owner can manage the shop.", 403);
  const worker = data.staff.find((p) => p.id === user.staffId)?.worker;
  const item = data.orders
    .find((o) => o.id === action.orderId)
    ?.items.find((i) => i.id === action.pieceId);
  if (
    !worker?.active ||
    !item ||
    item.work?.assigneeId !== user.staffId ||
    !worker.skills.includes(item.station)
  )
    throw new WorkspaceError("This work is not assigned to your account.", 403);
  if (!worker.available && action.operation === "start")
    throw new WorkspaceError(
      "Your account is marked unavailable. Ask the owner to make you available before starting new work.",
      409,
    );
}
export async function saveWorkerAccount(
  tx: DatabaseTransaction,
  action: Extract<WorkspaceMutation, { type: "team.save" }>,
  id: string,
) {
  const [previous] = await tx
    .select({ email: workerAccounts.email })
    .from(workerAccounts)
    .where(eq(workerAccounts.staffId, id));
  const [owner] = await tx
    .select({ email: owners.email })
    .from(owners)
    .where(eq(owners.id, 1));
  const [duplicate] = await tx
    .select({ id: workerAccounts.staffId })
    .from(workerAccounts)
    .where(eq(workerAccounts.email, action.worker.email));
  if (
    owner?.email.toLowerCase() === action.worker.email ||
    (duplicate && duplicate.id !== id)
  )
    throw new WorkspaceError(
      "This email is already used by another account.",
      409,
    );
  const profile = {
    name: action.name,
    email: action.worker.email,
    active: action.worker.active,
  };
  if (action.password) {
    const salt = randomBytes(32).toString("hex");
    const passwordHash = await hashPassword(action.password, salt);
    await tx
      .insert(workerAccounts)
      .values({ staffId: id, ...profile, salt, passwordHash })
      .onConflictDoUpdate({
        target: workerAccounts.staffId,
        set: { ...profile, salt, passwordHash },
      });
  } else
    await tx
      .update(workerAccounts)
      .set(profile)
      .where(eq(workerAccounts.staffId, id));
  // Changing credentials or disabling a member revokes every old device session.
  if (action.password || !profile.active || previous?.email !== profile.email)
    await tx.delete(workerSessions).where(eq(workerSessions.staffId, id));
}
