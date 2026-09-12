import { z } from "zod";
import { pageQuery } from "@/shared/contracts/query-input";
export const billingFilter = z
  .enum(["pending", "settled", "all"])
  .default("pending");
export const billingQuery = pageQuery.extend({ filter: billingFilter });
export type BillingQuery = z.infer<typeof billingQuery>;
