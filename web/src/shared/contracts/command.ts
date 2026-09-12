import { z } from "zod";
import { saveCustomerSchema } from "@/features/customers/contracts/customer";
import {
  createOrderSchema,
  deliverOrderSchema,
} from "@/features/orders/contracts/order";
import {
  advancePieceSchema,
  reworkPieceSchema,
} from "@/features/workflow/contracts/workflow";
import { recordPaymentSchema } from "@/features/billing/contracts/payment";
import { closeDaySchema } from "@/features/reports/contracts/report";

export const mutationSchema = z.discriminatedUnion("type", [
  saveCustomerSchema,
  createOrderSchema,
  deliverOrderSchema,
  advancePieceSchema,
  reworkPieceSchema,
  recordPaymentSchema,
  closeDaySchema,
]);
export type WorkspaceMutation = z.infer<typeof mutationSchema>;
export const commandSchema = z.object({
  mutationId: z.uuid(),
  action: mutationSchema,
});
