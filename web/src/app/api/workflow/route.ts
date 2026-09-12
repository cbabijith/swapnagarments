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
