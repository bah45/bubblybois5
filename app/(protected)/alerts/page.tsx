"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { getUser } from "@/lib/auth-client";

interface Alert {
  id: string;
  createdAt: string;
  nodeId: string;
  machineId: string;
  severity: string;
  title: string;
  message: string;
  triggerReason: string | null;
  acknowledged: boolean;
  acknowledgedBy: string | null;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch("/api/alerts", { cache: "no-store" });
    setAlerts(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 8000);
    return () => clearInterval(id);
  }, []);

  async function act(id: string, action: "acknowledge" | "resolve" | "reopen") {
    const user = await getUser();
    const operator = user?.email ?? "unknown";
    await fetch(`/api/alerts/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action, operator }),
    });
    load();
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Alert Lifecycle</h1>
        <p className="text-sm text-muted">Acknowledge, resolve, and reopen alerts generated from real anomaly triggers.</p>
      </div>

      {!loading && alerts.length === 0 && (
        <Card><CardContent className="py-10 text-center text-muted">NO TELEMETRY RECORDED</CardContent></Card>
      )}

      <div className="space-y-3">
        {alerts.map((a) => {
          const state = a.resolvedAt ? "RESOLVED" : a.acknowledged ? "ACKNOWLEDGED" : "OPEN";
          return (
            <Card key={a.id}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{a.title}</CardTitle>
                <div className="flex gap-2">
                  <Badge variant={a.severity === "CRITICAL" ? "danger" : "warning"}>{a.severity}</Badge>
                  <Badge variant={state === "OPEN" ? "danger" : state === "ACKNOWLEDGED" ? "warning" : "success"}>{state}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-foreground/90">{a.message}</p>
                <p className="text-xs text-muted">
                  {a.machineId} · {format(new Date(a.createdAt), "PPpp")}
                  {a.acknowledgedBy && ` · Acknowledged by ${a.acknowledgedBy}`}
                </p>
                <div className="flex gap-2 pt-1">
                  {state === "OPEN" && <Button onClick={() => act(a.id, "acknowledge")}>Acknowledge</Button>}
                  {state !== "RESOLVED" && <Button variant="outline" onClick={() => act(a.id, "resolve")}>Resolve</Button>}
                  {state === "RESOLVED" && <Button variant="outline" onClick={() => act(a.id, "reopen")}>Reopen</Button>}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
