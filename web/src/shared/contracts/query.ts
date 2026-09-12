import type { Workspace } from "@/shared/workspace";

export type PageInfo = {
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
};

/** Bounded record slices retain the existing record DTOs during feature extraction. */
export type WorkspacePage = {
  revision: number;
  data: Workspace;
  page: PageInfo;
};
