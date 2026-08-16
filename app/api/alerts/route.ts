import { db } from "@/db";
import { alerts } from "@/db/schema";
import { desc } from "drizzle-orm";

export async function GET() {
  const rows = await db.select().from(alerts).orderBy(desc(alerts.createdAt)).limit(200);
  return Response.json(rows);
}
