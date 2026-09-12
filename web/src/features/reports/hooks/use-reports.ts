"use client";
import { useWorkspace } from "@/shared/compat/workspace-provider";
import { shopDate } from "@/shared/workspace";

export function useReports() {
  const workspace = useWorkspace();
  return {
    ...workspace,
    closeDay: async () => {
      await workspace.send(
        { type: "day.close", date: shopDate() },
        "Daily report saved.",
      );
    },
  };
}
