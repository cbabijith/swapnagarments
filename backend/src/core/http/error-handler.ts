import { AppError } from "../errors/app-errors";
import { createLogger } from "../logging/logger";
import { jsonError } from "./api-response";

/**
 * Hono `app.onError` mapper: every thrown AppError becomes the standard
 * error envelope; anything unexpected is logged (with an error id) and
 * becomes a 500 without leaking internals.
 */
export function toErrorResponse(error: unknown): Response {
  if (error instanceof AppError) {
    return jsonError(error.code, error.message, error.status, error.details);
  }
  const errorId = crypto.randomUUID();
  createLogger().error("Unhandled error in route handler", {
    errorId,
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  });
  return jsonError("INTERNAL_ERROR", "An unexpected error occurred. Please try again.", 500, {
    errorId,
  });
}
