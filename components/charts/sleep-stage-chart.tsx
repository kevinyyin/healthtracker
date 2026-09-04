"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { SLEEP_STAGE_COLORS } from "@/lib/chart-colors";
import { AccessibleChart } from "@/components/charts/accessible-chart";

export interface SleepStageNight {
  date: string;
  deep: number | null;
  rem: number | null;
  light: number | null;
  awake: number | null;
}

function formatMinutes(value: unknown): string {
  const minutes = Number(value);
  if (!Number.isFinite(minutes)) return String(value);
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function SleepStageChart({ nights }: { nights: SleepStageNight[] }) {
  if (nights.length === 0) return null;

  return (
    <AccessibleChart
      ariaLabel={`Sleep stages for the last ${nights.length} nights: deep, REM, light, and awake minutes per night.`}
      tableCaption="Sleep stage minutes per night"
      headers={["Night", "Deep (min)", "REM (min)", "Light (min)", "Awake (min)"]}
      rows={nights.map((n) => [n.date, n.deep ?? "-", n.rem ?? "-", n.light ?? "-", n.awake ?? "-"])}
    >
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={nights}>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="currentColor" opacity={0.4} />
            <YAxis tick={{ fontSize: 11 }} stroke="currentColor" opacity={0.4} unit="m" />
            <Tooltip
              formatter={(value) => formatMinutes(value)}
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
    </AccessibleChart>
  );
}
