import { db } from "@/db";
import { nodes } from "@/db/schema";

export async function GET() {
  const rows = await db.select().from(nodes);
  return Response.json(rows);
}
