import { z } from "zod";
import { saveCustomerSchema } from "@/features/customers/contracts/customer";
import { commandHandler } from "@/shared/server/command-handler";
export const runtime = "nodejs";
export const POST = commandHandler(
  z.object({ mutationId: z.uuid(), action: saveCustomerSchema }),
);
import { directoryQuery } from "@/shared/contracts/query-input";
import { queryHandler } from "@/shared/server/query-handler";
import { readCustomers } from "@/services/customer-read-service";
export const GET = queryHandler(directoryQuery, readCustomers);
