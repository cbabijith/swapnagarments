import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { checkStorage, storageConfigured } from "@/integrations/storage";

export async function connectionHealth() {
  const bucketConfigured = storageConfigured();
  await Promise.all([
    db().execute(sql`SELECT 1`),
    ...(bucketConfigured ? [checkStorage()] : []),
  ]);
  return {
    status: "ok",
    database: "connected",
    bucket: bucketConfigured ? "connected" : "unconfigured",
  };
}
