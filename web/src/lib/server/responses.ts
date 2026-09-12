import { NextResponse } from "next/server";
import { WorkspaceError } from "../workspace-mutations";
export const json = (data: unknown, status = 200) =>
  NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
export function failure(error: unknown) {
  if (error instanceof WorkspaceError)
    return json({ error: error.message }, error.status);
  console.error(
    "The workspace request could not be completed.",
    error instanceof Error ? error.name : "UnknownError",
  );
  return json(
    {
      error:
        "The database connection is unavailable. Please check the Railway service connection and try again.",
    },
    503,
  );
}
