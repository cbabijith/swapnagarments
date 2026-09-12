import { z } from "zod";
export const dashboardQuery = z.object({
  taskFilter: z.enum(["due", "urgent", "ready"]).default("due"),
});
