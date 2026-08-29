"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BIO_AGE_COLOR, CHRONO_AGE_COLOR } from "@/lib/chart-colors";

export interface BioAgeTrendPoint {
  date: string;
  bioAge: number | null;
  chronoAge: number;
}

export function BioAgeTrendChart({ data }: { data: BioAgeTrendPoint[] }) {
  if (data.length === 0) return null;

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} minTickGap={40} stroke="currentColor" opacity={0.4} />
          <YAxis tick={{ fontSize: 11 }} stroke="currentColor" opacity={0.4} />
          <Tooltip
            contentStyle={{ background: "var(--background)", border: "1px solid rgba(128,128,128,0.3)", fontSize: 12 }}
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
  );
}
