"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format } from "date-fns";

export interface LogRow {
  id: string;
  createdAt: string;
  vibrationRms: number | null;
  peakCurrent: number | null;
  supercapVoltage: number | null;
  zScore: number | null;
  kurtosis: number | null;
}

export function TelemetryLineChart({
  data,
  dataKey,
  label,
  color,
  unit,
}: {
  data: LogRow[];
  dataKey: keyof LogRow;
  label: string;
  color: string;
  unit?: string;
}) {
  if (data.length === 0) {
    return <div className="h-64 flex items-center justify-center text-sm text-muted">NO TELEMETRY RECORDED</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={256}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 20% 18%)" />
        <XAxis
          dataKey="createdAt"
          tickFormatter={(v) => format(new Date(v), "HH:mm:ss")}
          stroke="hsl(220 15% 60%)"
          fontSize={11}
          minTickGap={40}
        />
        <YAxis stroke="hsl(220 15% 60%)" fontSize={11} width={40} />
        <Tooltip
          labelFormatter={(v) => format(new Date(v), "PPpp")}
          formatter={(value: number) => [`${value}${unit ?? ""}`, label]}
          contentStyle={{ background: "hsl(222 25% 9%)", border: "1px solid hsl(220 20% 18%)", fontSize: 12 }}
        />
        <Line type="monotone" dataKey={dataKey} stroke={color} dot={false} strokeWidth={2} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
