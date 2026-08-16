import { db } from "@/db";
import { maintenanceLogs, nodes } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  classifyEnergyState,
  ENERGY_STATE_LABEL,
  ENERGY_STATE_DESCRIPTION,
  computeHealthScore,
  healthFromScore,
  monitoringStrategy,
} from "@/lib/energy";
import { EnergyCurveChart } from "@/components/charts/energy-curve-chart";

export const dynamic = "force-dynamic";

export default async function EnergyPage() {
  const allNodes = await db.select().from(nodes);

  const data = await Promise.all(
    allNodes.map(async (node) => {
      const rows = await db
        .select()
        .from(maintenanceLogs)
        .where(eq(maintenanceLogs.nodeId, node.nodeId))
        .orderBy(desc(maintenanceLogs.createdAt))
        .limit(100);
      return {
        node,
        rows: rows.reverse().map((row) => ({
          ...row,
          createdAt: row.createdAt.toISOString(),
        })),
      };
    })
  );

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Energy Intelligence</h1>
        <p className="text-sm text-muted">LTC3588-1 supercapacitor charge behavior and adaptive monitoring strategy.</p>
      </div>

      {data.length === 0 && <Card><CardContent className="py-10 text-center text-muted">NO TELEMETRY RECORDED</CardContent></Card>}

      {data.map(({ node, rows }) => {
        const latest = rows[rows.length - 1];
        const energyState = classifyEnergyState(latest?.supercapVoltage);
        const score = latest ? computeHealthScore(latest) : null;
        const health = score != null ? healthFromScore(score) : null;

        return (
          <div key={node.id} className="space-y-4">
            <Card>
              <CardHeader><CardTitle>{node.machineId} — Supercapacitor Voltage Curve</CardTitle></CardHeader>
              <CardContent>
                <EnergyCurveChart data={rows} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>ENERGY-AWARE INTELLIGENCE</CardTitle></CardHeader>
              <CardContent>
                {!latest ? (
                  <div className="text-sm text-muted py-4 text-center">NO TELEMETRY RECORDED</div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-3 items-center text-sm">
                      <Badge variant="default">Energy: {energyState ? ENERGY_STATE_LABEL[energyState] : "—"}</Badge>
                      <Badge variant={health === "GOOD" ? "success" : health === "WARNING" ? "warning" : "danger"}>Machine: {health ?? "—"}</Badge>
                    </div>
                    <p className="text-sm text-muted">{energyState ? ENERGY_STATE_DESCRIPTION[energyState] : ""}</p>
                    <div className="rounded-md border border-primary/30 bg-primary/5 px-4 py-3">
                      <div className="text-xs uppercase tracking-wide text-primary mb-1">Dynamic Monitoring Strategy</div>
                      <div className="text-sm">{health && energyState ? monitoringStrategy(health, energyState) : "Insufficient data to compute strategy."}</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );
      })}
    </div>
  );
}
