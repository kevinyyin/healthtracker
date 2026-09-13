import type { NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { daysBefore, todayLocalDateString, DEFAULT_TIMEZONE } from "@/lib/date";
import { toNum } from "@/lib/numeric";

const PERIOD_DAYS: Record<string, number> = { week: 7, month: 30, year: 365 };

function csvCell(value: string | number | null): string {
  if (value == null) return "";
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Downloads the recap period's raw health_logs as CSV — for sharing with a doctor. */
export async function GET(request: NextRequest) {
  const { supabase, user } = await requireUser();

  const periodKey = request.nextUrl.searchParams.get("period") ?? "month";
  const days = PERIOD_DAYS[periodKey] ?? PERIOD_DAYS.month;

  const { data: profile } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("user_id", user.id)
    .maybeSingle();
  const timezone = profile?.timezone ?? DEFAULT_TIMEZONE;
  const today = todayLocalDateString(timezone);
  const periodStart = daysBefore(today, days - 1);

  const { data: healthLogRows } = await supabase
    .from("health_logs")
    .select(
      "date, hrv_rmssd, resting_hr, spo2, total_sleep_minutes, deep_sleep_minutes, rem_sleep_minutes, awake_minutes, wake_count, sleep_latency_minutes",
    )
    .eq("user_id", user.id)
    .gte("date", periodStart)
    .lte("date", today)
    .order("date", { ascending: true });

  const { data: weightRows } = await supabase
    .from("vitals_readings")
    .select("recorded_at, value")
    .eq("user_id", user.id)
    .eq("metric_type", "weight")
    .gte("recorded_at", periodStart)
    .order("recorded_at", { ascending: true });
  const weightByDate = new Map((weightRows ?? []).map((r) => [r.recorded_at.slice(0, 10), toNum(r.value)]));

  const headers = [
    "date",
    "hrv_rmssd_ms",
    "resting_hr_bpm",
    "spo2_pct",
    "total_sleep_minutes",
    "deep_sleep_minutes",
    "rem_sleep_minutes",
    "awake_minutes",
    "wake_count",
    "sleep_latency_minutes",
    "weight_kg",
  ];

  const rows = (healthLogRows ?? []).map((l) => [
    l.date,
    toNum(l.hrv_rmssd),
    toNum(l.resting_hr),
    toNum(l.spo2),
    toNum(l.total_sleep_minutes),
    toNum(l.deep_sleep_minutes),
    toNum(l.rem_sleep_minutes),
    toNum(l.awake_minutes),
    l.wake_count as number | null,
    toNum(l.sleep_latency_minutes),
    weightByDate.get(l.date) ?? null,
  ]);

  const csv = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="recap-${periodKey}-${today}.csv"`,
    },
  });
}
