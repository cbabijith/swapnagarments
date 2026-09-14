"use client";
import { useWorkspace } from "@/shared/compat/workspace-provider";
import { useFeatureQuery } from "@/shared/hooks/use-feature-query";
import { workerProfileFor } from "../domain/worker-profile";
import type { WorkerProfileRead } from "../types/worker-profile";

export function useWorkerProfile() {
  const { owner } = useWorkspace();
  return useFeatureQuery<WorkerProfileRead>(
    owner.role === "worker" ? "/api/work/profile" : null,
    (data) => ({
      revision: 0,
      profile: workerProfileFor(
        data.staff.find((person) => person.id === owner.staffId),
      ),
    }),
  );
}
