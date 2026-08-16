import { db } from "@/db";
import { maintenanceLogs } from "@/db/schema";
import { and, gte, lte } from "drizzle-orm";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");

  const conditions = [];
  if (from) conditions.push(gte(maintenanceLogs.createdAt, new Date(from)));
  if (to) conditions.push(lte(maintenanceLogs.createdAt, new Date(to)));

  const rows = await db
    .select()
    .from(maintenanceLogs)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(maintenanceLogs.createdAt);

  return Response.json(rows);
}
