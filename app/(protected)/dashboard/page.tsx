import { db } from "@/db";
import { nodes, maintenanceLogs } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { computeHealthScore, healthFromScore, isOffline, formatDuration, secondsSince, classifyEnergyState, ENERGY_STATE_LABEL } from "@/lib/energy";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const allNodes = await db.select().from(nodes);

  const nodeData = await Promise.all(
    allNodes.map(async (node) => {
      const [latest] = await db
        .select()
        .from(maintenanceLogs)
        .where(eq(maintenanceLogs.nodeId, node.nodeId))
        .orderBy(desc(maintenanceLogs.createdAt))
        .limit(1);
      return { node, latest };
    })
  );

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Operational Overview</h1>
        <p className="text-sm text-muted">Live status derived strictly from ESP32 node telemetry.</p>
      </div>

      {nodeData.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-muted">NO TELEMETRY RECORDED</CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {nodeData.map(({ node, latest }) => {
          const offline = isOffline(node.lastSeen);
          const score = latest
            ? computeHealthScore({
                vibrationRms: latest.vibrationRms,
                peakCurrent: latest.peakCurrent,
                zScore: latest.zScore,
                kurtosis: latest.kurtosis,
                panic: latest.panic,
              })
            : null;
          const health = score != null ? healthFromScore(score) : null;
          const energyState = classifyEnergyState(latest?.supercapVoltage);

          return (
            <Card key={node.id}>
              <CardHeader className="flex items-center justify-between flex-row">
                <CardTitle>{node.machineId}</CardTitle>
                <Badge variant={offline ? "danger" : "success"}>
                  <span className={`status-dot ${offline ? "bg-danger" : "bg-success"}`} />
                  {offline ? `OFFLINE ${formatDuration(secondsSince(node.lastSeen))}` : "ONLINE"}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-xs text-muted">Node {node.nodeId}</div>

                {!latest ? (
                  <div className="text-sm text-muted py-4 text-center">NO TELEMETRY RECORDED</div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <Metric label="Health Score" value={score != null ? `${score}/100` : "—"} />
                      <Metric label="Condition" value={health ?? "—"} />
                      <Metric label="Vibration RMS" value={latest.vibrationRms != null ? `${latest.vibrationRms.toFixed(2)} g` : "—"} />
                      <Metric label="Peak Current" value={latest.peakCurrent != null ? `${latest.peakCurrent.toFixed(2)} A` : "—"} />
                      <Metric label="Supercap Voltage" value={latest.supercapVoltage != null ? `${latest.supercapVoltage.toFixed(2)} V` : "—"} />
                      <Metric label="Energy State" value={energyState ? ENERGY_STATE_LABEL[energyState] : "—"} />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-muted">{label}</div>
      <div className="font-mono text-sm">{value}</div>
    </div>
  );
}
