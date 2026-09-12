import { z } from "zod";
import { date } from "@/shared/contracts/fields";
export const closeDaySchema = z.object({ type: z.literal("day.close"), date });
