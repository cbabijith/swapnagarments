import type { AssignmentSettings, WorkQuery } from "../contracts/team";
import type { safeWorkPiece } from "../domain/assignment";
import type { WorkspacePage, PageInfo } from "@/shared/contracts/query";
export type WorkPiece = ReturnType<typeof safeWorkPiece> & {
  assigneeName?: string;
  unassignedReason?: string;
};
export type WorkRead = {
  revision: number;
  today: string;
  page: PageInfo;
  pieces: WorkPiece[];
  summary: {
    total: number;
    pending: number;
    inProgress: number;
    blocked: number;
    unassigned: number;
    overdue: number;
  };
};
export type TeamRead = WorkspacePage & {
  settings: AssignmentSettings;
  loads: Record<
    string,
    { pieces: number; minutes: number; inProgress: number; blocked: number }
  >;
};
export type { WorkQuery };
