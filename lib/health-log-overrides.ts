import { daysBefore, localDateTimeToIso } from "@/lib/date";

export interface HealthLogOverride {
  date: string;
  hrv_rmssd: number | null;
  resting_hr: number | null;
  spo2: number | null;
  total_sleep_minutes: number | null;
  deep_sleep_minutes: number | null;
  rem_sleep_minutes: number | null;
  light_sleep_minutes: number | null;
  awake_minutes: number | null;
  // Optional — only the Today and Sleep pages read these 3 Sleep Score inputs
  // (Restfulness/Latency/Timing factors); Trends and Biological Age don't select
  // these columns from health_log_overrides at all, so their override objects omit
  // them entirely rather than always fetching columns they'd never use.
  wake_count?: number | null;
  sleep_latency_minutes?: number | null;
  sleep_start?: string | null;
}

const OVERRIDE_KEYS = [
  "hrv_rmssd",
  "resting_hr",
  "spo2",
  "total_sleep_minutes",
  "deep_sleep_minutes",
  "rem_sleep_minutes",
  "light_sleep_minutes",
  "awake_minutes",
  "wake_count",
  "sleep_latency_minutes",
  "sleep_start",
] as const satisfies readonly (keyof Omit<HealthLogOverride, "date">)[];

/**
 * The correction drawer only asks for bedtime as a time-of-day, paired with the date
 * being corrected — which is the *wake* date (see rollup.ts's `date =
 * localDateString(session.end_time, timezone)`). A typical bedtime is the evening
 * *before* the wake date, so a time-of-day >= noon is interpreted as the previous
 * calendar day and a time-of-day < noon as the wake date itself (an after-midnight
 * bedtime) — the same noon-boundary convention sleep-score.ts's
 * continuousBedtimeMinutes() already uses.
 */
export function sleepStartIso(wakeDate: string, timeString: string, timezone: string): string {
  const [hh, mm] = timeString.split(":").map(Number);
  const bedtimeDate = hh * 60 + mm >= 12 * 60 ? daysBefore(wakeDate, 1) : wakeDate;
  return localDateTimeToIso(bedtimeDate, timeString, timezone);
}

/**
 * Merges a manual correction on top of synced health_logs rows, matched by date. Only
 * non-null override fields replace the synced value — a field left blank in the
 * correction drawer means "no override," not "force to zero." Rows whose shape
 * doesn't include a given override key (e.g. Trends' narrower HealthLogRow) simply
 * don't get that field touched, so this is safe to call against any of the several
 * differently-shaped mapped-log types the pages use.
 */
export function applyOverrides<T extends { date: string }>(logs: T[], overrides: HealthLogOverride[]): T[] {
  if (overrides.length === 0) return logs;
  const byDate = new Map(overrides.map((o) => [o.date, o]));

  return logs.map((log) => {
    const override = byDate.get(log.date);
    if (!override) return log;

    let changed = false;
    const merged: T = { ...log };
    for (const key of OVERRIDE_KEYS) {
      const value = override[key];
      if (value != null && key in merged) {
        (merged as Record<string, unknown>)[key] = value;
        changed = true;
      }
    }
    return changed ? merged : log;
  });
}
