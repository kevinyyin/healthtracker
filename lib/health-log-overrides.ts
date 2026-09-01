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
] as const satisfies readonly (keyof Omit<HealthLogOverride, "date">)[];

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
