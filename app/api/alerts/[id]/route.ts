import { db } from "@/db";
import { alerts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const action = body.action as "acknowledge" | "resolve" | "reopen";
  const operator = typeof body.operator === "string" ? body.operator : "unknown";

  let update: Partial<typeof alerts.$inferInsert> = {};
  if (action === "acknowledge") {
    update = { acknowledged: true, acknowledgedBy: operator, acknowledgedAt: new Date() };
  } else if (action === "resolve") {
    update = { resolvedAt: new Date() };
  } else if (action === "reopen") {
    update = { acknowledged: false, acknowledgedBy: null, acknowledgedAt: null, resolvedAt: null };
  } else {
    return new Response("Invalid action", { status: 400 });
  }

  const [updated] = await db.update(alerts).set(update).where(eq(alerts.id, id)).returning();
  return Response.json(updated);
}
