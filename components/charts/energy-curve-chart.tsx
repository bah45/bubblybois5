"use client";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { format } from "date-fns";
import type { LogRow } from "./telemetry-line-chart";

export function EnergyCurveChart({ data }: { data: LogRow[] }) {
  if (data.length === 0) {
    return <div className="h-64 flex items-center justify-center text-sm text-muted">NO TELEMETRY RECORDED</div>;
  }
  return (
    <ResponsiveContainer width="100%" height={256}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="cap" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#34d399" stopOpacity={0.5} />
            <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 20% 18%)" />
        <XAxis dataKey="createdAt" tickFormatter={(v) => format(new Date(v), "HH:mm:ss")} stroke="hsl(220 15% 60%)" fontSize={11} minTickGap={40} />
        <YAxis domain={[2.6, 4.2]} stroke="hsl(220 15% 60%)" fontSize={11} width={40} />
        <Tooltip
          labelFormatter={(v) => format(new Date(v), "PPpp")}
          formatter={(value: number) => [`${value} V`, "Supercap Voltage"]}
          contentStyle={{ background: "hsl(222 25% 9%)", border: "1px solid hsl(220 20% 18%)", fontSize: 12 }}
        />
        <ReferenceLine y={3.7} stroke="#38bdf8" strokeDasharray="4 4" label={{ value: "HIGH", fontSize: 10, fill: "#38bdf8" }} />
        <ReferenceLine y={3.4} stroke="#facc15" strokeDasharray="4 4" label={{ value: "NORMAL", fontSize: 10, fill: "#facc15" }} />
        <ReferenceLine y={3.1} stroke="#f87171" strokeDasharray="4 4" label={{ value: "CRITICAL", fontSize: 10, fill: "#f87171" }} />
        <Area type="monotone" dataKey="supercapVoltage" stroke="#34d399" fill="url(#cap)" isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
