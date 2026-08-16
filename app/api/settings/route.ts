import { db } from "@/db";
import { settings } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const rows = await db.select().from(settings);
  return Response.json(rows);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { key, value } = body as { key: string; value: string };
  if (!key) return new Response("Missing key", { status: 400 });

  await db
    .insert(settings)
    .values({ key, value: value ?? "" })
    .onConflictDoUpdate({ target: settings.key, set: { value: value ?? "" } });

  const [row] = await db.select().from(settings).where(eq(settings.key, key));
  return Response.json(row);
}
