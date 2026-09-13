import { mean, stddev, sortByDateAscending } from "@/lib/analytics/stats";

export interface NightlyMetrics {
  date: string;
  hrv_rmssd: number | null;
  resting_hr: number | null;
}

export interface RecoveryResult {
  score: number | null;
  confidence: "insufficient" | "building" | "full";
  nightsUsed: number;
}

const BASELINE_WINDOW_DAYS = 14;
const MIN_NIGHTS_FOR_SCORE = 3;
const HRV_WEIGHT = 0.6;
const RHR_WEIGHT = 0.4;

function logistic(z: number): number {
  return 100 / (1 + Math.exp(-z));
}

/**
 * Compares tonight's nocturnal HRV/RHR against a rolling baseline (mean + stddev)
 * built from the prior nights in `history`. Higher HRV and lower RHR relative to
 * baseline both push the score up. Dates in `excludedDates` (e.g. flagged Sick/
 * Injured/Traveling via lib/activity-status.ts) are skipped when building the
 * baseline, so an atypical stretch doesn't skew comparisons for weeks afterward.
 */
export function computeRecoveryScore(
  history: NightlyMetrics[],
  tonight: NightlyMetrics,
  excludedDates?: Set<string>,
): RecoveryResult {
  const baseline = sortByDateAscending(history)
    .filter((n) => n.date < tonight.date && !excludedDates?.has(n.date))
    .slice(-BASELINE_WINDOW_DAYS);

  const hrvHistory = baseline.map((n) => n.hrv_rmssd).filter((v): v is number => v != null);
  const rhrHistory = baseline.map((n) => n.resting_hr).filter((v): v is number => v != null);

  const nightsUsed = Math.min(hrvHistory.length, rhrHistory.length);

  if (nightsUsed < MIN_NIGHTS_FOR_SCORE || tonight.hrv_rmssd == null || tonight.resting_hr == null) {
    return { score: null, confidence: "insufficient", nightsUsed };
  }

  const hrvMean = mean(hrvHistory);
  const hrvStd = stddev(hrvHistory, hrvMean);
  const rhrMean = mean(rhrHistory);
  const rhrStd = stddev(rhrHistory, rhrMean);

  const zHrv = (tonight.hrv_rmssd - hrvMean) / Math.max(hrvStd, 1e-6);
  // Sign-flipped: lower RHR than baseline is good, so it should push z positive.
  const zRhr = (rhrMean - tonight.resting_hr) / Math.max(rhrStd, 1e-6);

  const z = HRV_WEIGHT * zHrv + RHR_WEIGHT * zRhr;
  const score = Math.min(100, Math.max(0, logistic(z)));

  return {
    score,
    confidence: nightsUsed >= BASELINE_WINDOW_DAYS ? "full" : "building",
    nightsUsed,
  };
}
