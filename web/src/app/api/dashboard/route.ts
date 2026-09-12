import { dashboardQuery } from "@/features/dashboard/contracts/query";
import { queryHandler } from "@/shared/server/query-handler";
import { readDashboard } from "@/services/dashboard-read-service";
export const GET = queryHandler(dashboardQuery, readDashboard);
export const runtime = "nodejs";
