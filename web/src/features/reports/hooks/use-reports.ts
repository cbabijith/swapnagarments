"use client";
import { useWorkspace } from "@/shared/compat/workspace-provider";

export function useReports() {
  const workspace = useWorkspace();
  return {
    ...workspace,
    closeDay: async () => {
      await workspace.send(
        { type: "day.close", date: workspace.today },
        "Daily report saved.",
      );
    },
  };
}
