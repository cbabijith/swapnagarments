import type { NextRequest } from "next/server";
import { readWorkerProfile } from "@/services/worker-profile-service";
import { requireUser } from "@/shared/server/auth";
import { json, failure } from "@/shared/server/responses";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    return json(await readWorkerProfile(await requireUser(request)));
  } catch (error) {
    return failure(error);
  }
}
