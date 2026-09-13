import { z } from "zod";
import {
  saveProfileSchema,
  savePieceMeasurementsSchema,
} from "@/features/measurements/contracts/profiles";
import { commandHandler } from "@/shared/server/command-handler";
export const runtime = "nodejs";
export const POST = commandHandler(
  z.object({
    mutationId: z.uuid(),
    action: z.discriminatedUnion("type", [
      saveProfileSchema,
      savePieceMeasurementsSchema,
    ]),
  }),
);
