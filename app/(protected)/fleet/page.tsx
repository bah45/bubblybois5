import { db } from "@/db";
import { nodes, maintenanceLogs } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { isOffline, computeHealthScore, healthFromScore, formatDuration, secondsSince } from "@/lib/energy";

export const dynamic = "force-dynamic";

export default async function FleetPage() {
  const allNodes = await db.select().from(nodes);

  const fleet = await Promise.all(
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

  const online = fleet.filter((f) => !isOffline(f.node.lastSeen)).length;
  const offline = fleet.length - online;

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Fleet Overview</h1>
        <p className="text-sm text-muted">Aggregated status across all registered ESP32 nodes.</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="py-4"><div className="text-2xl font-mono">{fleet.length}</div><div className="text-xs text-muted uppercase">Total Nodes</div></CardContent></Card>
        <Card><CardContent className="py-4"><div className="text-2xl font-mono text-success">{online}</div><div className="text-xs text-muted uppercase">Online</div></CardContent></Card>
        <Card><CardContent className="py-4"><div className="text-2xl font-mono text-danger">{offline}</div><div className="text-xs text-muted uppercase">Offline</div></CardContent></Card>
      </div>

      {fleet.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted">NO TELEMETRY RECORDED</CardContent></Card>
      ) : (
        <Card>
          <CardHeader><CardTitle>Node Registry</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead className="text-muted uppercase text-[10px]">
                <tr>
                  <th className="text-left py-2">Machine</th>
                  <th className="text-left py-2">Node ID</th>
                  <th className="text-left py-2">Status</th>
                  <th className="text-left py-2">Health</th>
                  <th className="text-left py-2">Firmware</th>
                </tr>
              </thead>
              <tbody>
                {fleet.map(({ node, latest }) => {
                  const offlineNow = isOffline(node.lastSeen);
                  const score = latest ? computeHealthScore(latest) : null;
                  const health = score != null ? healthFromScore(score) : null;
                  return (
                    <tr key={node.id} className="border-t border-border/50">
                      <td className="py-2">{node.machineId}</td>
                      <td className="py-2 font-mono text-xs">{node.nodeId}</td>
                      <td className="py-2">
                        <Badge variant={offlineNow ? "danger" : "success"}>
                          {offlineNow ? `OFFLINE ${formatDuration(secondsSince(node.lastSeen))}` : "ONLINE"}
                        </Badge>
                      </td>
                      <td className="py-2">
                        {health ? <Badge variant={health === "GOOD" ? "success" : health === "WARNING" ? "warning" : "danger"}>{health}</Badge> : "—"}
                      </td>
                      <td className="py-2 font-mono text-xs">{node.firmwareVersion ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
