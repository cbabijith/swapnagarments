import { teamQuery } from "@/features/team/contracts/query";
import { queryHandler } from "@/shared/server/query-handler";
import { readTeamMembers } from "@/services/team-read-service";
import { teamCommandSchema } from "@/features/team/contracts/team";
import { commandHandler } from "@/shared/server/command-handler";
export const GET = queryHandler(teamQuery, readTeamMembers);
export const POST = commandHandler(teamCommandSchema);
export const runtime = "nodejs";
