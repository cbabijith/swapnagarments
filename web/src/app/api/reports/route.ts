import { z } from "zod";
import { closeDaySchema } from "@/features/reports/contracts/report";
import { commandHandler } from "@/shared/server/command-handler";
export const runtime = "nodejs";
export const POST = commandHandler(
  z.object({ mutationId: z.uuid(), action: closeDaySchema }),
);
import { pageQuery } from "@/shared/contracts/query-input";
import { queryHandler } from "@/shared/server/query-handler";
import { readReports } from "@/services/shop-read-service";
export const GET = queryHandler(pageQuery, readReports);
