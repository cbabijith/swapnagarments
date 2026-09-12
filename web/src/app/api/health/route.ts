import { json } from "@/shared/server/responses";
import { connectionHealth } from "@/services/health-service";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  if (!process.env.DATABASE_URL) return json({ status: "unconfigured" }, 503);
  try {
    return json(await connectionHealth());
  } catch {
    return json({ status: "unavailable" }, 503);
  }
}
