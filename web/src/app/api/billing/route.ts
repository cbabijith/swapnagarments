import { z } from "zod";
import { recordPaymentSchema } from "@/features/billing/contracts/payment";
import { applyGstSchema } from "@/features/billing/contracts/gst";
import { commandHandler } from "@/shared/server/command-handler";
export const runtime = "nodejs";
export const POST = commandHandler(
  z.object({
    mutationId: z.uuid(),
    action: z.discriminatedUnion("type", [recordPaymentSchema, applyGstSchema]),
  }),
);
import { billingQuery } from "@/features/billing/contracts/query";
import { queryHandler } from "@/shared/server/query-handler";
import { readBilling } from "@/services/order-read-service";
export const GET = queryHandler(billingQuery, readBilling);
