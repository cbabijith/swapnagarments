import { z } from "zod";
import { recordPaymentSchema } from "@/features/billing/contracts/payment";
import { commandHandler } from "@/shared/server/command-handler";
export const runtime = "nodejs";
export const POST = commandHandler(
  z.object({ mutationId: z.uuid(), action: recordPaymentSchema }),
);
