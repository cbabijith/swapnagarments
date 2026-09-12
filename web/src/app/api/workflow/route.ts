import { z } from "zod";
import {
  advancePieceSchema,
  reworkPieceSchema,
} from "@/features/workflow/contracts/workflow";
import { commandHandler } from "@/shared/server/command-handler";
export const runtime = "nodejs";
export const POST = commandHandler(
  z.object({
    mutationId: z.uuid(),
    action: z.discriminatedUnion("type", [
      advancePieceSchema,
      reworkPieceSchema,
    ]),
  }),
);
import { workflowQuery } from "@/features/workflow/contracts/query";
import { queryHandler } from "@/shared/server/query-handler";
import { readWorkflow } from "@/services/workflow-read-service";
export const GET = queryHandler(workflowQuery, readWorkflow);
