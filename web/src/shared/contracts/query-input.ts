import { z } from "zod";

const pageNumber = z.coerce.number().int().min(1).max(1_000_000).default(1);
const pageSize = z.coerce.number().int().min(1).max(50).default(20);
export const pageQuery = z.object({ page: pageNumber, pageSize });
export const directoryQuery = pageQuery.extend({
  q: z.string().trim().max(200).default(""),
});
export const noQuery = z.object({});
export const recordId = z.string().min(1).max(200);
export type PageQuery = z.infer<typeof pageQuery>;
