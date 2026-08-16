import { db } from "@/db";
import { maintenanceEvents } from "@/db/schema";
import { desc } from "drizzle-orm";

export async function GET() {
  const rows = await db.select().from(maintenanceEvents).orderBy(desc(maintenanceEvents.createdAt)).limit(100);
  return Response.json(rows);
}

export async function POST(req: Request) {
  const body = await req.json();
  const [row] = await db
    .insert(maintenanceEvents)
    .values({
      machineId: body.machineId,
      type: body.type,
      description: body.description ?? null,
      operator: body.operator ?? null,
      status: body.status ?? "open",
    })
    .returning();
  return Response.json(row);
}
