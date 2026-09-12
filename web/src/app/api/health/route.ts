import { database } from "@/lib/server/database";
import { json } from "@/lib/server/responses";
import { checkStorage, storageConfigured } from "@/lib/server/storage";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  if (!process.env.DATABASE_URL) return json({ status: "unconfigured" }, 503);
  try {
    const bucketConfigured = storageConfigured();
    await Promise.all([
      database().query("SELECT 1"),
      ...(bucketConfigured ? [checkStorage()] : []),
    ]);
    return json({
      status: "ok",
      database: "connected",
      bucket: bucketConfigured ? "connected" : "unconfigured",
    });
  } catch {
    return json({ status: "unavailable" }, 503);
  }
}
