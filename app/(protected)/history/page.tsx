"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

const RANGES = [
  { key: "1h", label: "1 Hour", ms: 60 * 60 * 1000 },
  { key: "6h", label: "6 Hours", ms: 6 * 60 * 60 * 1000 },
  { key: "24h", label: "24 Hours", ms: 24 * 60 * 60 * 1000 },
  { key: "7d", label: "7 Days", ms: 7 * 24 * 60 * 60 * 1000 },
  { key: "30d", label: "30 Days", ms: 30 * 24 * 60 * 60 * 1000 },
];

interface Row {
  id: string;
  createdAt: string;
  nodeId: string;
  machineId: string;
  vibrationRms: number | null;
  peakCurrent: number | null;
  supercapVoltage: number | null;
  variance: number | null;
  kurtosis: number | null;
  zScore: number | null;
  panic: boolean;
  severity: string | null;
  anomalyDetected: boolean;
  triggerReason: string | null;
  energyState: string | null;
}

export default function HistoryPage() {
  const [range, setRange] = useState("24h");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [queried, setQueried] = useState(false);

  async function runQuery() {
    setLoading(true);
    setQueried(true);
    try {
      let from: string, to: string;
      if (range === "custom") {
        from = customFrom;
        to = customTo;
      } else {
        const r = RANGES.find((x) => x.key === range)!;
        from = new Date(Date.now() - r.ms).toISOString();
        to = new Date().toISOString();
      }
      const qs = new URLSearchParams({ from, to });
      const res = await fetch(`/api/history?${qs.toString()}`, { cache: "no-store" });
      const data = await res.json();
      setRows(data);
    } finally {
      setLoading(false);
    }
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" });
    downloadBlob(blob, `telemetry-${range}.json`);
  }

  function exportCsv() {
    if (rows.length === 0) return;
    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(","),
      ...rows.map((r) => headers.map((h) => JSON.stringify((r as unknown as Record<string, unknown>)[h] ?? "")).join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    downloadBlob(blob, `telemetry-${range}.csv`);
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Historical Query</h1>
        <p className="text-sm text-muted">Query real recorded telemetry across a time window and export the exact dataset.</p>
      </div>

      <Card>
        <CardContent className="pt-5 flex flex-wrap items-end gap-3">
          {RANGES.map((r) => (
            <Button key={r.key} variant={range === r.key ? "default" : "outline"} onClick={() => setRange(r.key)}>
              {r.label}
            </Button>
          ))}
          <Button variant={range === "custom" ? "default" : "outline"} onClick={() => setRange("custom")}>
            Custom
          </Button>
          {range === "custom" && (
            <div className="flex items-center gap-2">
              <input type="datetime-local" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="rounded-md border border-border bg-background px-2 py-1.5 text-sm" />
              <span className="text-muted text-sm">to</span>
              <input type="datetime-local" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="rounded-md border border-border bg-background px-2 py-1.5 text-sm" />
            </div>
          )}
          <Button onClick={runQuery} disabled={loading}>{loading ? "Querying…" : "Run Query"}</Button>
          <div className="flex-1" />
          <Button variant="outline" onClick={exportCsv} disabled={rows.length === 0}>Export CSV</Button>
          <Button variant="outline" onClick={exportJson} disabled={rows.length === 0}>Export JSON</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Results ({rows.length} of up to 100 shown per query window)</CardTitle></CardHeader>
        <CardContent>
          {!queried ? (
            <div className="text-sm text-muted py-6 text-center">Select a range and run a query.</div>
          ) : rows.length === 0 ? (
            <div className="text-sm text-muted py-6 text-center">NO TELEMETRY RECORDED</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono">
                <thead className="text-muted uppercase text-[10px]">
                  <tr>
                    <th className="text-left py-1.5 pr-3">Time</th>
                    <th className="text-left py-1.5 pr-3">Node</th>
                    <th className="text-right py-1.5 pr-3">Vibration</th>
                    <th className="text-right py-1.5 pr-3">Current</th>
                    <th className="text-right py-1.5 pr-3">Supercap V</th>
                    <th className="text-right py-1.5 pr-3">Z</th>
                    <th className="text-left py-1.5">Severity</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 100).map((r) => (
                    <tr key={r.id} className="border-t border-border/50">
                      <td className="py-1.5 pr-3">{format(new Date(r.createdAt), "MM/dd HH:mm:ss")}</td>
                      <td className="py-1.5 pr-3">{r.nodeId}</td>
                      <td className="py-1.5 pr-3 text-right">{r.vibrationRms?.toFixed(2) ?? "—"}</td>
                      <td className="py-1.5 pr-3 text-right">{r.peakCurrent?.toFixed(2) ?? "—"}</td>
                      <td className="py-1.5 pr-3 text-right">{r.supercapVoltage?.toFixed(2) ?? "—"}</td>
                      <td className="py-1.5 pr-3 text-right">{r.zScore?.toFixed(2) ?? "—"}</td>
                      <td className="py-1.5">{r.severity ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
