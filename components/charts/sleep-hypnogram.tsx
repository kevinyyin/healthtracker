"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { SLEEP_STAGE_COLORS } from "@/lib/chart-colors";
import { AccessibleChart } from "@/components/charts/accessible-chart";

export interface HypnogramSegment {
  type: string;
  startTime: string;
  endTime: string;
}

// Depth on the y-axis, deepest sleep at the bottom — standard hypnogram convention.
const STAGE_DEPTH: Record<string, number> = { AWAKE: 3, REM: 2, LIGHT: 1, DEEP: 0 };
const STAGE_LABELS: Record<number, string> = { 3: "Awake", 2: "REM", 1: "Light", 0: "Deep" };
const HYPNOGRAM_COLOR = SLEEP_STAGE_COLORS.deep;

function formatClockTime(t: number): string {
  return new Date(t).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function SleepHypnogram({ segments }: { segments: HypnogramSegment[] }) {
  const known = segments.filter((s) => s.type in STAGE_DEPTH);
  if (known.length === 0) return null;

  // A stepped line needs a point at each segment's start (holding that segment's
  // depth) plus one final point at the last segment's end, so the last stage's step
  // actually extends to the end of the night instead of stopping short.
  const points = known.map((s) => ({ t: new Date(s.startTime).getTime(), depth: STAGE_DEPTH[s.type] }));
  const last = known[known.length - 1];
  points.push({ t: new Date(last.endTime).getTime(), depth: STAGE_DEPTH[last.type] });

  return (
    <AccessibleChart
      ariaLabel="Sleep stage timeline for last night, from lying down to waking up."
      tableCaption="Sleep stages by time"
      headers={["Start", "End", "Stage"]}
      rows={known.map((s) => [formatClockTime(new Date(s.startTime).getTime()), formatClockTime(new Date(s.endTime).getTime()), s.type])}
    >
      <div className="h-40 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points}>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
            <XAxis
              dataKey="t"
              type="number"
              domain={["dataMin", "dataMax"]}
              tick={{ fontSize: 11 }}
              tickFormatter={formatClockTime}
              stroke="currentColor"
              opacity={0.4}
            />
            <YAxis
              dataKey="depth"
              type="number"
              domain={[0, 3]}
              ticks={[0, 1, 2, 3]}
              tickFormatter={(d: number) => STAGE_LABELS[d]}
              tick={{ fontSize: 11 }}
              stroke="currentColor"
              opacity={0.4}
              width={48}
            />
            <Tooltip
              labelFormatter={(t) => formatClockTime(Number(t))}
              formatter={(value) => [STAGE_LABELS[Number(value)], "Stage"]}
              contentStyle={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                fontSize: 12,
                fontFamily: "var(--font-mono)",
                boxShadow: "var(--shadow-card)",
              }}
            />
            <Line type="stepAfter" dataKey="depth" name="Stage" stroke={HYPNOGRAM_COLOR} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </AccessibleChart>
  );
}
