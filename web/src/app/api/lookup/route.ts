import { lookupQuery } from "@/features/qr-tags/contracts/query";
import { queryHandler } from "@/shared/server/query-handler";
import { lookupOrder } from "@/services/order-read-service";
export const GET = queryHandler(lookupQuery, lookupOrder);
export const runtime = "nodejs";
