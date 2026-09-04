import type { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { jsonError } from "./api-response";

/**
 * Zod validation middleware for Hono routes. Invalid payloads short-circuit
 * with the standard error envelope and never reach the handler. Parsed data
 * stays fully typed in handlers via `c.req.valid("json" | "query")`.
 */
export function validateJson<Schema extends z.ZodType>(schema: Schema) {
  return zValidator("json", schema, (result, _c) => {
    if (!result.success) {
      return jsonError(
        "VALIDATION_ERROR",
        "The request payload is invalid.",
        400,
        result.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      );
    }
  });
}

export function validateQuery<Schema extends z.ZodType>(schema: Schema) {
  return zValidator("query", schema, (result, _c) => {
    if (!result.success) {
      return jsonError(
        "VALIDATION_ERROR",
        "The request query parameters are invalid.",
        400,
        result.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      );
    }
  });
}
