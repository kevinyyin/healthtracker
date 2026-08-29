"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { METRIC_TREND_COLOR } from "@/lib/chart-colors";

export interface TrendPoint {
  date: string;
  value: number | null;
}

export function MetricTrendChart({ data, label }: { data: TrendPoint[]; label: string }) {
  if (data.length === 0) return null;

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} minTickGap={40} stroke="currentColor" opacity={0.4} />
          <YAxis domain={["auto", "auto"]} tick={{ fontSize: 11 }} stroke="currentColor" opacity={0.4} />
          <Tooltip
            contentStyle={{ background: "var(--background)", border: "1px solid rgba(128,128,128,0.3)", fontSize: 12 }}
          />
          <Line type="monotone" dataKey="value" name={label} stroke={METRIC_TREND_COLOR} dot={false} connectNulls />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
