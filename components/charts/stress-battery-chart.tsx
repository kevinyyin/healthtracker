"use client";

import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BATTERY_COLOR, STRESS_COLOR } from "@/lib/chart-colors";
import { AccessibleChart } from "@/components/charts/accessible-chart";

export interface StressBatteryPoint {
  minute: string;
  battery: number;
  stress: number | null;
}

export function StressBatteryChart({ data }: { data: StressBatteryPoint[] }) {
  if (data.length === 0) return null;

  return (
    <AccessibleChart
      ariaLabel="Energy bank and stress today, by minute."
      tableCaption="Energy bank and stress by time of day"
      headers={["Time", "Energy Bank (%)", "Stress (%)"]}
      rows={data.map((p) => [p.minute, p.battery, p.stress ?? "-"])}
    >
      <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
          <XAxis dataKey="minute" tick={{ fontSize: 11 }} minTickGap={40} stroke="currentColor" opacity={0.4} />
          <YAxis yAxisId="battery" domain={[0, 100]} tick={{ fontSize: 11 }} stroke="currentColor" opacity={0.4} />
          <YAxis
            yAxisId="stress"
            orientation="right"
            domain={[0, 100]}
            tick={{ fontSize: 11 }}
            stroke="currentColor"
            opacity={0.4}
          />
          <Tooltip
            contentStyle={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              fontSize: 12,
              fontFamily: "var(--font-mono)",
              boxShadow: "var(--shadow-card)",
            }}
          />
          <Area
            yAxisId="battery"
            type="monotone"
            dataKey="battery"
            name="Energy Bank"
            stroke={BATTERY_COLOR}
            fill={BATTERY_COLOR}
            fillOpacity={0.15}
          />
          <Line
            yAxisId="stress"
            type="monotone"
            dataKey="stress"
            name="Stress"
            stroke={STRESS_COLOR}
            dot={false}
            connectNulls
          />
        </ComposedChart>
      </ResponsiveContainer>
      </div>
    </AccessibleChart>
  );
}
