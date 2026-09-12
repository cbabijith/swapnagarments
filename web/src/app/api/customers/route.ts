import { z } from "zod";
import { saveCustomerSchema } from "@/features/customers/contracts/customer";
import { commandHandler } from "@/shared/server/command-handler";
export const runtime = "nodejs";
export const POST = commandHandler(
  z.object({ mutationId: z.uuid(), action: saveCustomerSchema }),
);
