import type { NextRequest } from "next/server";
import { credentialsSchema } from "@/features/auth/contracts/credentials";
import {
  authenticate,
  checkRateLimit,
  revokeSession,
} from "@/services/auth-service";
import { checkOrigin, COOKIE } from "@/shared/server/auth";
import { json, failure } from "@/shared/server/responses";
import { readBody } from "@/shared/server/request";

export const runtime = "nodejs";
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};
export async function POST(request: NextRequest) {
  try {
    checkOrigin(request);
    await checkRateLimit();
    const input = await readBody(request, credentialsSchema, 4096);
    const token = await authenticate(input);
    const response = json({ success: true });
    response.cookies.set(COOKIE, token, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60,
    });
    return response;
  } catch (error) {
    return failure(error);
  }
}
export async function DELETE(request: NextRequest) {
  try {
    checkOrigin(request);
    await revokeSession(request.cookies.get(COOKIE)?.value);
    const response = json({ success: true });
    response.cookies.set(COOKIE, "", { ...cookieOptions, maxAge: 0 });
    return response;
  } catch (error) {
    return failure(error);
  }
}
