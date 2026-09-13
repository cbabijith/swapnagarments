import { z } from "zod";
import { pageQuery } from "@/shared/contracts/query-input";
export const teamQuery = pageQuery.extend({
  q: z.string().trim().max(100).default(""),
  eligibleStation: z.enum(["0", "1", "2", "3", "4"]).optional(),
});
export type TeamQuery = z.infer<typeof teamQuery>;
