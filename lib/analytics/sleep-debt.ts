export interface SleepNight {
  date: string;
  total_sleep_minutes: number | null;
}

export const BASELINE_MINUTES = 480; // 8 hours
const MAX_DEBT_REPAYMENT_MINUTES = 120;
const DEBT_REPAYMENT_FRACTION = 1 / 3;
const EXERTION_MINUTES_PER_STRAIN_POINT = 1.26; // 6 min/point on Strain's old 0-21 scale, rescaled to 0-100
const MIN_TARGET_MINUTES = 360;
const MAX_TARGET_MINUTES = 600;

export interface SleepTargetResult {
  targetMinutes: number;
  debtMinutes: number;
  baselineMinutes: typeof BASELINE_MINUTES;
}

/**
 * Target sleep for tonight = 8h baseline, plus partial repayment of the trailing
 * 3-day sleep debt, plus a penalty scaled by today's exertion (Strain). Nights with
 * no data are treated as zero debt rather than penalized, so day-1 (no history) still
 * produces a sane 8h target.
 */
export function computeSleepTarget(last3Nights: SleepNight[], todayStrain: number | null): SleepTargetResult {
  const debtMinutes = last3Nights.reduce((total, night) => {
    if (night.total_sleep_minutes == null) return total;
    return total + Math.max(0, BASELINE_MINUTES - night.total_sleep_minutes);
  }, 0);

  const debtContribution = Math.min(debtMinutes * DEBT_REPAYMENT_FRACTION, MAX_DEBT_REPAYMENT_MINUTES);
  const exertionPenalty = (todayStrain ?? 0) * EXERTION_MINUTES_PER_STRAIN_POINT;

  const targetMinutes = Math.min(
    MAX_TARGET_MINUTES,
    Math.max(MIN_TARGET_MINUTES, BASELINE_MINUTES + debtContribution + exertionPenalty),
  );

  return { targetMinutes, debtMinutes, baselineMinutes: BASELINE_MINUTES };
}
