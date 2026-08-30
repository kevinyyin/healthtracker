"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { SLEEP_STAGE_COLORS } from "@/lib/chart-colors";

export interface SleepStageNight {
  date: string;
  deep: number | null;
  rem: number | null;
  light: number | null;
  awake: number | null;
}

export function SleepStageChart({ nights }: { nights: SleepStageNight[] }) {
  if (nights.length === 0) return null;

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={nights}>
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="currentColor" opacity={0.4} />
          <YAxis tick={{ fontSize: 11 }} stroke="currentColor" opacity={0.4} unit="m" />
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
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="deep" stackId="sleep" fill={SLEEP_STAGE_COLORS.deep} name="Deep" />
          <Bar dataKey="rem" stackId="sleep" fill={SLEEP_STAGE_COLORS.rem} name="REM" />
          <Bar dataKey="light" stackId="sleep" fill={SLEEP_STAGE_COLORS.light} name="Light" />
          <Bar dataKey="awake" stackId="sleep" fill={SLEEP_STAGE_COLORS.awake} name="Awake" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
