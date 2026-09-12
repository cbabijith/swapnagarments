import { z } from "zod";
export const lookupQuery = z.object({
  code: z.string().trim().min(1).max(300),
});
