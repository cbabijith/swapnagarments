import { pageQuery } from "@/shared/contracts/query-input";
import { queryHandler } from "@/shared/server/query-handler";
import { readTeam } from "@/services/shop-read-service";
export const GET = queryHandler(pageQuery, readTeam);
export const runtime = "nodejs";
