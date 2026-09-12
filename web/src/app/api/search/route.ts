import { directoryQuery } from "@/shared/contracts/query-input";
import { queryHandler } from "@/shared/server/query-handler";
import { readSearch } from "@/services/order-read-service";
export const GET = queryHandler(directoryQuery, readSearch);
export const runtime = "nodejs";
