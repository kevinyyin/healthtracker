"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { METRIC_TREND_COLOR } from "@/lib/chart-colors";
import { AccessibleChart } from "@/components/charts/accessible-chart";

export interface HrHistoryPoint {
  recorded_at: string;
  bpm: number;
}

function formatClockTime(t: number): string {
  return new Date(t).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function HrHistoryChart({ points }: { points: HrHistoryPoint[] }) {
  if (points.length === 0) return null;

  const data = points.map((p) => ({ t: new Date(p.recorded_at).getTime(), bpm: p.bpm }));
  const bpms = data.map((p) => p.bpm);

  return (
    <AccessibleChart
      ariaLabel={`Heart rate throughout the day, ranging from ${Math.min(...bpms)} to ${Math.max(...bpms)} beats per minute.`}
      tableCaption="Heart rate by time of day"
      headers={["Time", "BPM"]}
      rows={data.map((p) => [formatClockTime(p.t), p.bpm])}
    >
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
            <XAxis
              dataKey="t"
              type="number"
              domain={["dataMin", "dataMax"]}
              tick={{ fontSize: 11 }}
              minTickGap={40}
              tickFormatter={formatClockTime}
              stroke="currentColor"
              opacity={0.4}
            />
            <YAxis domain={["auto", "auto"]} tick={{ fontSize: 11 }} stroke="currentColor" opacity={0.4} unit=" bpm" />
            <Tooltip
              labelFormatter={(t) => formatClockTime(Number(t))}
              contentStyle={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                fontSize: 12,
                fontFamily: "var(--font-mono)",
                boxShadow: "var(--shadow-card)",
              }}
            />
            <Line type="monotone" dataKey="bpm" name="Heart rate" stroke={METRIC_TREND_COLOR} dot={false} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </AccessibleChart>
  );
}
