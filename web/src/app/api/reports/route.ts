import { z } from "zod";
import { closeDaySchema } from "@/features/reports/contracts/report";
import { commandHandler } from "@/shared/server/command-handler";
export const runtime = "nodejs";
export const POST = commandHandler(
  z.object({ mutationId: z.uuid(), action: closeDaySchema }),
);
