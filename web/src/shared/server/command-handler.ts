import "server-only";
import type { NextRequest } from "next/server";
import type { z } from "zod";
import type { SessionUser } from "@/features/team/contracts/team";
import type { WorkspaceMutation } from "@/shared/contracts/command";
import { executeWorkspaceCommand } from "@/services/workspace-service";
import { checkOrigin, requireOwner, requireUser } from "./auth";
import { json, failure } from "./responses";
import { readBody } from "./request";

export function commandHandler(
  schema: z.ZodType<{ mutationId: string; action: WorkspaceMutation }>,
  maximum = 100_000,
  allowWorker = false,
) {
  return async (request: NextRequest) => {
    try {
      checkOrigin(request);
      const owner: SessionUser = await (allowWorker
        ? requireUser(request)
        : requireOwner(request));
      const input = await readBody(request, schema, maximum);
      const result = await executeWorkspaceCommand(input, owner);
      // Existing clients retain their snapshot contract during the transition.
      if (
        owner.role === "worker" ||
        request.headers.get("prefer") === "return=minimal"
      ) {
        const response = json({
          revision: result.revision,
          resultId: result.resultId,
        });
        response.headers.set("Preference-Applied", "return=minimal");
        return response;
      }
      return json(result);
    } catch (error) {
      return failure(error);
    }
  };
}
