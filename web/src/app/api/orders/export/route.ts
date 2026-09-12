import type { NextRequest } from "next/server";
import { exportQuery } from "@/features/orders/contracts/query";
import { parseQuery } from "@/shared/server/query-handler";
import { requireOwner } from "@/shared/server/auth";
import { failure } from "@/shared/server/responses";
import { exportOrderRows } from "@/services/order-read-service";
export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  try {
    await requireOwner(request);
    const result = await exportOrderRows(parseQuery(request, exportQuery));
    return new Response(result.csv, {
      headers: {
        "Content-Type": "text/csv;charset=utf-8",
        "Content-Disposition": `attachment; filename="${result.filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return failure(error);
  }
}
