import { db } from "@/db";
import { maintenanceLogs, nodes } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { computeHealthScore, healthFromScore } from "@/lib/energy";

export const dynamic = "force-dynamic";

export default async function HealthPage() {
  const allNodes = await db.select().from(nodes);

  const breakdown = await Promise.all(
    allNodes.map(async (node) => {
      const rows = await db
        .select()
        .from(maintenanceLogs)
        .where(eq(maintenanceLogs.nodeId, node.nodeId))
        .orderBy(desc(maintenanceLogs.createdAt))
        .limit(100);
      return { node, rows };
    })
  );

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Health Analytics</h1>
        <p className="text-sm text-muted">Contributing risk factors and maintenance priority, computed from the latest 100 real telemetry rows per node.</p>
      </div>

      {breakdown.length === 0 && (
        <Card><CardContent className="py-10 text-center text-muted">NO TELEMETRY RECORDED</CardContent></Card>
      )}

      <div className="grid grid-cols-1 gap-4">
        {breakdown.map(({ node, rows }) => {
          const latest = rows[0];
          const score = latest ? computeHealthScore(latest) : null;
          const health = score != null ? healthFromScore(score) : null;
          const avgVibration = rows.length ? rows.reduce((a, r) => a + (r.vibrationRms ?? 0), 0) / rows.length : null;
          const maxZ = rows.length ? Math.max(...rows.map((r) => r.zScore ?? 0)) : null;
          const anomalyCount = rows.filter((r) => r.anomalyDetected).length;

          return (
            <Card key={node.id}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{node.machineId} — {node.nodeId}</CardTitle>
                {health && (
                  <Badge variant={health === "GOOD" ? "success" : health === "WARNING" ? "warning" : "danger"}>{health}</Badge>
                )}
              </CardHeader>
              <CardContent>
                {!latest ? (
                  <div className="text-sm text-muted py-6 text-center">NO TELEMETRY RECORDED</div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <Stat label="Health Score" value={`${score}/100`} />
                    <Stat label="Avg Vibration RMS (100 rows)" value={`${avgVibration?.toFixed(2)} g`} />
                    <Stat label="Peak Z-Score (100 rows)" value={`${maxZ?.toFixed(2)}`} />
                    <Stat label="Anomalies in window" value={`${anomalyCount} / ${rows.length}`} />
                    <Stat label="Maintenance Priority" value={health === "CRITICAL" ? "Immediate" : health === "WARNING" ? "Scheduled" : "Routine"} />
                    <Stat label="Last Trigger Reason" value={latest.triggerReason ?? "None"} />
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-muted">{label}</div>
      <div className="font-mono">{value}</div>
    </div>
  );
}
