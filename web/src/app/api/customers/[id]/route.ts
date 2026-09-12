import { pageQuery } from "@/shared/contracts/query-input";
import { detailQueryHandler } from "@/shared/server/query-handler";
import { readCustomer } from "@/services/customer-read-service";
export const runtime = "nodejs";
export const GET = detailQueryHandler(pageQuery, readCustomer);
