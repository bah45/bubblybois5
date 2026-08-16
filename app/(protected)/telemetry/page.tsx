"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TelemetryLineChart } from "@/components/charts/telemetry-line-chart";
import { useLiveLogs } from "@/components/charts/use-live-logs";

export default function TelemetryPage() {
  const { logs, loading } = useLiveLogs();

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Real-Time Telemetry</h1>
        <p className="text-sm text-muted">
          Live plots sourced directly from incoming ESP32 payloads. {loading ? "Loading…" : `${logs.length} records in window.`}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Vibration RMS (g)</CardTitle></CardHeader>
          <CardContent><TelemetryLineChart data={logs} dataKey="vibrationRms" label="Vibration RMS" color="#38bdf8" unit=" g" /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Peak Current (A)</CardTitle></CardHeader>
          <CardContent><TelemetryLineChart data={logs} dataKey="peakCurrent" label="Peak Current" color="#f59e0b" unit=" A" /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Supercap Voltage (V)</CardTitle></CardHeader>
          <CardContent><TelemetryLineChart data={logs} dataKey="supercapVoltage" label="Supercap Voltage" color="#34d399" unit=" V" /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Z-Score</CardTitle></CardHeader>
          <CardContent><TelemetryLineChart data={logs} dataKey="zScore" label="Z-Score" color="#f87171" /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Kurtosis</CardTitle></CardHeader>
          <CardContent><TelemetryLineChart data={logs} dataKey="kurtosis" label="Kurtosis" color="#a78bfa" /></CardContent>
        </Card>
      </div>
    </div>
  );
}
