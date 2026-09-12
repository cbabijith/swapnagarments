import { noQuery } from "@/shared/contracts/query-input";
import { queryHandler } from "@/shared/server/query-handler";
import { readShell } from "@/services/shop-read-service";
export const GET = queryHandler(noQuery, readShell);
export const runtime = "nodejs";
