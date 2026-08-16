import { db } from "@/db";
import { maintenanceLogs } from "@/db/schema";
import { desc, eq, and, gte } from "drizzle-orm";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const nodeId = req.nextUrl.searchParams.get("nodeId");
  const limit = Math.min(100, Number(req.nextUrl.searchParams.get("limit") ?? 100));
  const since = req.nextUrl.searchParams.get("since");

  const conditions = [];
  if (nodeId) conditions.push(eq(maintenanceLogs.nodeId, nodeId));
  if (since) conditions.push(gte(maintenanceLogs.createdAt, new Date(since)));

  const rows = await db
    .select()
    .from(maintenanceLogs)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(maintenanceLogs.createdAt))
    .limit(limit);

  return Response.json(rows.reverse());
}
