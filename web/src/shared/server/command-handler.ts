import "server-only";
import type { NextRequest } from "next/server";
import type { z } from "zod";
import type { WorkspaceMutation } from "@/shared/contracts/command";
import { executeWorkspaceCommand } from "@/services/workspace-service";
import { checkOrigin, requireOwner } from "./auth";
import { json, failure } from "./responses";
import { readBody } from "./request";

export function commandHandler(
  schema: z.ZodType<{ mutationId: string; action: WorkspaceMutation }>,
) {
  return async (request: NextRequest) => {
    try {
      checkOrigin(request);
      const owner = await requireOwner(request);
      const input = await readBody(request, schema);
      return json(await executeWorkspaceCommand(input, owner));
    } catch (error) {
      return failure(error);
    }
  };
}
