import { z } from "zod";
import { id, amount, method } from "@/shared/contracts/fields";
export const recordPaymentSchema = z.object({
  type: z.literal("payment.record"),
  orderId: id,
  amount: amount.min(1),
  method,
});
