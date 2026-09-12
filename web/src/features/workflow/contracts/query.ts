import { z } from "zod";
import { pageQuery } from "@/shared/contracts/query-input";
export const workflowQuery = pageQuery.extend({
  station: z.enum(["all", "0", "1", "2", "3", "4"]).default("all"),
});
