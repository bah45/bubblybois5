import type { Config } from "@netlify/functions";
import { db } from "../../db/index.js";
import { nodes, maintenanceLogs, alerts } from "../../db/schema.js";
import { eq, and, gte, desc } from "drizzle-orm";
import { evaluateAnomaly, type TelemetryPayload } from "../../lib/anomaly.js";
import { classifyEnergyState } from "../../lib/energy.js";
import { Resend } from "resend";

const COOLDOWN_MS = 5 * 60 * 1000;

export default async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const authHeader = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${process.env.ESP32_DEVICE_API_KEY ?? ""}`;
  if (!process.env.ESP32_DEVICE_API_KEY || authHeader !== expected) {
    return new Response("Unauthorized", { status: 401 });
  }

  let payload: TelemetryPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response("Invalid JSON body", { status: 400 });
  }

  if (!payload.node_id || !payload.machine_id || payload.vibration_rms == null) {
    return new Response("Missing required telemetry fields", { status: 400 });
  }

  const energyState = classifyEnergyState(payload.supercap_voltage) ?? "NORMAL";
  const anomaly = evaluateAnomaly(payload);
  const now = new Date();

  await db
    .insert(nodes)
    .values({
      nodeId: payload.node_id,
      machineId: payload.machine_id,
      firmwareVersion: payload.firmware_version ?? null,
      lastSeen: now,
      status: "ONLINE",
      energyState,
    })
    .onConflictDoUpdate({
      target: nodes.nodeId,
      set: {
        machineId: payload.machine_id,
        firmwareVersion: payload.firmware_version ?? null,
        lastSeen: now,
        status: "ONLINE",
        energyState,
      },
    });

  const [log] = await db
    .insert(maintenanceLogs)
    .values({
      nodeId: payload.node_id,
      machineId: payload.machine_id,
      vibrationRms: payload.vibration_rms,
      peakCurrent: payload.peak_current,
      supercapVoltage: payload.supercap_voltage,
      variance: payload.variance ?? null,
      kurtosis: payload.kurtosis ?? null,
      zScore: payload.z_score ?? null,
      panic: payload.panic ?? false,
      severity: anomaly.severity,
      anomalyDetected: anomaly.isAnomaly,
      triggerReason: anomaly.reasons.join("; ") || null,
      energyState,
    })
    .returning();

  let alertCreated = false;

  if (anomaly.isAnomaly) {
    const cooldownStart = new Date(Date.now() - COOLDOWN_MS);
    const recent = await db
      .select()
      .from(alerts)
      .where(
        and(
          eq(alerts.nodeId, payload.node_id),
          eq(alerts.triggerReason, anomaly.reasons.join("; ")),
          gte(alerts.createdAt, cooldownStart)
        )
      )
      .orderBy(desc(alerts.createdAt))
      .limit(1);

    if (recent.length === 0) {
      const title = `${anomaly.severity} anomaly on ${payload.machine_id}`;
      const message = `Node ${payload.node_id} on machine ${payload.machine_id} triggered: ${anomaly.reasons.join("; ")}.`;

      await db.insert(alerts).values({
        nodeId: payload.node_id,
        machineId: payload.machine_id,
        severity: anomaly.severity,
        title,
        message,
        triggerReason: anomaly.reasons.join("; "),
      });
      alertCreated = true;

      await Promise.allSettled([
        sendEmergencyEmail(title, message),
        postWebhook({ node_id: payload.node_id, machine_id: payload.machine_id, ...payload, reasons: anomaly.reasons, severity: anomaly.severity }),
      ]);
    }
  }

  return Response.json({ ok: true, log_id: log.id, energy_state: energyState, alert_created: alertCreated });
};

async function sendEmergencyEmail(subject: string, message: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.ALERT_EMAIL_TO;
  if (!apiKey || !to) return;
  const resend = new Resend(apiKey);
  await resend.emails.send({
    from: process.env.ALERT_EMAIL_FROM ?? "alerts@bubblybois.dev",
    to: to.split(",").map((s) => s.trim()),
    subject: `[Bubbly Bois] ${subject}`,
    text: message,
  });
}

async function postWebhook(body: Record<string, unknown>) {
  const url = process.env.EMERGENCY_WEBHOOK_URL;
  if (!url) return;
  await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

export const config: Config = {
  path: "/api/telemetry",
};
