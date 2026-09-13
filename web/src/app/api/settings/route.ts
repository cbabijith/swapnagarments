import { z } from "zod";
import { saveCatalogueSchema } from "@/features/settings/contracts/catalogue";
import { commandHandler } from "@/shared/server/command-handler";
import { queryHandler } from "@/shared/server/query-handler";
import { readCatalogue } from "@/services/catalogue-storage";
export const runtime = "nodejs";
export const GET = queryHandler(z.object({}), readCatalogue);
export const POST = commandHandler(
  z.object({ mutationId: z.uuid(), action: saveCatalogueSchema }),
);
