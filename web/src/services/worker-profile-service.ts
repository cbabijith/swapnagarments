import "server-only";
import { eq } from "drizzle-orm";
import { staff } from "@/db/schema";
import type { SessionUser } from "@/features/team/contracts/team";
import { workerProfileFor } from "@/features/team/domain/worker-profile";
import type { WorkerProfileRead } from "@/features/team/types/worker-profile";
import { WorkspaceError } from "@/shared/errors";
import { withRead } from "./read-context";

export function readWorkerProfile(user: SessionUser) {
  if (user.role !== "worker" || !user.staffId)
    throw new WorkspaceError(
      "Sign in with a worker account to view your profile.",
      403,
    );
  const workerId = user.staffId;
  return withRead(
    async ({ tx, legacy, revision }): Promise<WorkerProfileRead> => {
      const person = legacy
        ? legacy.staff.find((entry) => entry.id === workerId)
        : (
            await tx.select().from(staff).where(eq(staff.id, workerId)).limit(1)
          )[0];
      const profile = workerProfileFor(
        person
          ? {
              ...person,
              worker: person.worker ?? undefined,
            }
          : undefined,
      );
      if (!profile)
        throw new WorkspaceError(
          "Your worker profile is unavailable. Please sign in again.",
          401,
        );
      return { revision, profile };
    },
  );
}
