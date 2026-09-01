"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BIO_AGE_COLOR, CHRONO_AGE_COLOR } from "@/lib/chart-colors";
import { AccessibleChart } from "@/components/charts/accessible-chart";

export interface BioAgeTrendPoint {
  date: string;
  bioAge: number | null;
  chronoAge: number;
}

export function BioAgeTrendChart({ data }: { data: BioAgeTrendPoint[] }) {
  if (data.length === 0) return null;

  return (
    <AccessibleChart
      ariaLabel={`Biological age vs chronological age over ${data.length} days.`}
      tableCaption="Biological age vs chronological age by date"
      headers={["Date", "Biological age", "Chronological age"]}
      rows={data.map((p) => [p.date, p.bioAge ?? "-", p.chronoAge])}
    >
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} minTickGap={40} stroke="currentColor" opacity={0.4} />
            <YAxis tick={{ fontSize: 11 }} stroke="currentColor" opacity={0.4} />
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
            <Line type="monotone" dataKey="bioAge" name="Biological age" stroke={BIO_AGE_COLOR} dot={false} connectNulls />
            <Line
              type="monotone"
              dataKey="chronoAge"
              name="Chronological age"
              stroke={CHRONO_AGE_COLOR}
              strokeDasharray="4 4"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </AccessibleChart>
  );
}
