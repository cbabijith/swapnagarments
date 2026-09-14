"use client";
import { useInfiniteFeatureQuery } from "@/shared/hooks/use-infinite-feature-query";
import { workspacePageAdapter } from "@/shared/queries/workspace-pages";
import { emptyWorkspace } from "@/shared/workspace";
import {
  defaultAssignmentSettings,
  eligible,
  workloads,
} from "../domain/assignment";
import type { TeamRead } from "../types/queries";
export function useTeam(page = 1, q = "", station?: number) {
  const pageSize = 20;
  return useInfiniteFeatureQuery<TeamRead>(
    `/api/team?page=${page}&pageSize=${pageSize}&q=${encodeURIComponent(q)}${station === undefined ? "" : `&eligibleStation=${station}`}`,
    (data, page) => {
      const filtered = data.staff.filter(
        (p) =>
          p.name.toLowerCase().includes(q.toLowerCase()) &&
          (station === undefined || eligible(p, station)),
      );
      return {
        revision: 0,
        data: {
          ...emptyWorkspace(),
          staff: filtered.slice((page - 1) * pageSize, page * pageSize),
        },
        settings: data.assignmentSettings ?? defaultAssignmentSettings(),
        loads: Object.fromEntries(workloads(data)),
        page: {
          page,
          pageSize,
          total: filtered.length,
          pageCount: Math.ceil(filtered.length / pageSize),
        },
      };
    },
    teamPageAdapter,
  );
}

const teamPageAdapter = {
  page: workspacePageAdapter.page,
  merge: (pages: TeamRead[]): TeamRead => ({
    ...workspacePageAdapter.merge(pages),
    loads: Object.assign({}, ...pages.map((page) => page.loads)),
  }),
};
