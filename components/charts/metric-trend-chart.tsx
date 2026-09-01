"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { METRIC_TREND_COLOR } from "@/lib/chart-colors";
import { AccessibleChart } from "@/components/charts/accessible-chart";

export interface TrendPoint {
  date: string;
  value: number | null;
}

export function MetricTrendChart({ data, label }: { data: TrendPoint[]; label: string }) {
  if (data.length === 0) return null;

  const values = data.map((p) => p.value).filter((v): v is number => v != null);
  const range =
    values.length > 0 ? `, ranging from ${Math.min(...values)} to ${Math.max(...values)}` : ", no values yet";

  return (
    <AccessibleChart
      ariaLabel={`${label} trend over ${data.length} days${range}.`}
      tableCaption={`${label} by date`}
      headers={["Date", label]}
      rows={data.map((p) => [p.date, p.value ?? "-"])}
    >
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} minTickGap={40} stroke="currentColor" opacity={0.4} />
            <YAxis domain={["auto", "auto"]} tick={{ fontSize: 11 }} stroke="currentColor" opacity={0.4} />
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
            <Line type="monotone" dataKey="value" name={label} stroke={METRIC_TREND_COLOR} dot={false} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </AccessibleChart>
  );
}
