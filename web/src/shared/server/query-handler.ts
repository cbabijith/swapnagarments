import "server-only";
import type { NextRequest } from "next/server";
import type { z } from "zod";
import { requireOwner } from "./auth";
import { failure, json } from "./responses";
import { WorkspaceError } from "@/shared/errors";
import { recordId } from "@/shared/contracts/query-input";

export function parseQuery<T>(request: NextRequest, schema: z.ZodType<T>): T {
  const params = request.nextUrl.searchParams;
  for (const key of params.keys())
    if (params.getAll(key).length > 1)
      throw new WorkspaceError("Duplicate query parameters are not allowed.");
  const parsed = schema.safeParse(Object.fromEntries(params));
  if (!parsed.success)
    throw new WorkspaceError(
      parsed.error.issues[0]?.message ?? "Invalid query.",
    );
  return parsed.data;
}
export function queryHandler<T>(
  schema: z.ZodType<T>,
  read: (input: T) => Promise<unknown>,
) {
  return async (request: NextRequest) => {
    try {
      await requireOwner(request);
      return json(await read(parseQuery(request, schema)));
    } catch (error) {
      return failure(error);
    }
  };
}
export function detailQueryHandler<T>(
  schema: z.ZodType<T>,
  read: (id: string, input: T) => Promise<unknown>,
) {
  return async (
    request: NextRequest,
    context: { params: Promise<{ id: string }> },
  ) => {
    try {
      await requireOwner(request);
      const parsedId = recordId.safeParse((await context.params).id);
      if (!parsedId.success) throw new WorkspaceError("Invalid record ID.");
      return json(await read(parsedId.data, parseQuery(request, schema)));
    } catch (error) {
      return failure(error);
    }
  };
}
