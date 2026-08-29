"use client";

import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface StressBatteryPoint {
  minute: string;
  battery: number;
  stress: number | null;
}

export function StressBatteryChart({ data }: { data: StressBatteryPoint[] }) {
  if (data.length === 0) return null;

  return (
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
            contentStyle={{ background: "var(--background)", border: "1px solid rgba(128,128,128,0.3)", fontSize: 12 }}
          />
          <Area
            yAxisId="battery"
            type="monotone"
            dataKey="battery"
            name="Energy Bank"
            stroke="#4f9dff"
            fill="#4f9dff"
            fillOpacity={0.15}
          />
          <Line
            yAxisId="stress"
            type="monotone"
            dataKey="stress"
            name="Stress"
            stroke="#ef4444"
            dot={false}
            connectNulls
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
