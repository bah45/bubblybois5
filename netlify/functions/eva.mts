import type { Config } from "@netlify/functions";
import { db } from "../../db/index.js";
import { maintenanceLogs, alerts, nodes } from "../../db/schema.js";
import { desc } from "drizzle-orm";
import { generateText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
  baseURL: process.env.GOOGLE_GEMINI_BASE_URL,
});

export default async (req: Request) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const { question } = await req.json();
  if (!question || typeof question !== "string") {
    return new Response("Missing question", { status: 400 });
  }

  const [logs, recentAlerts, allNodes] = await Promise.all([
    db.select().from(maintenanceLogs).orderBy(desc(maintenanceLogs.createdAt)).limit(100),
    db.select().from(alerts).orderBy(desc(alerts.createdAt)).limit(20),
    db.select().from(nodes),
  ]);

  if (logs.length === 0) {
    return Response.json({
      answer: "I cannot assess the machine because no real telemetry has been received from the ESP32 node.",
    });
  }

  const dataContext = JSON.stringify({ latest_100_telemetry_rows: logs, recent_alerts: recentAlerts, nodes: allNodes });

  const { text } = await generateText({
    model: google("gemini-2.5-flash"),
    system: `You are EVA (Energy & Vibration Analyst), an assistant embedded in an industrial predictive-maintenance dashboard for an ESP32-based self-powered vibration/current monitoring node.
Rules:
1. You MUST answer strictly from the JSON telemetry data provided below. NEVER invent, guess, or hallucinate a numeric value that is not present in the data.
2. If the data array is empty, reply exactly: "I cannot assess the machine because no real telemetry has been received from the ESP32 node."
3. Respond fluently in whatever language the user asks in (the app is optimized for English, Tamil, and Hindi, but you may answer in any language requested).
4. Be concise and reference concrete figures (vibration_rms, peak_current, supercap_voltage, z_score, kurtosis, energy_state) from the data when relevant.

Telemetry data (latest up to 100 rows), recent alerts, and node registry:
${dataContext}`,
    prompt: question,
  });

  return Response.json({ answer: text });
};

export const config: Config = {
  path: "/api/eva",
};
