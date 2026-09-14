import { z } from "zod";
import { pageQuery } from "@/shared/contracts/query-input";

export const workHistoryId = z.uuid();

export const workHistoryQuery = pageQuery
  .extend({
    q: z.string().trim().max(200).default(""),
    station: z.enum(["all", "0", "1", "2", "3", "4"]).default("all"),
  })
  .strict();
export type WorkHistoryQuery = z.infer<typeof workHistoryQuery>;
