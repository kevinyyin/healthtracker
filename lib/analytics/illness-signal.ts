import { mean, stddev, zScore, sortByDateAscending } from "@/lib/analytics/stats";

export interface IllnessNightlyMetrics {
  date: string;
  hrv_rmssd: number | null;
  resting_hr: number | null;
  spo2: number | null;
}

export interface IllnessSignalResult {
  /** True only once the baseline is mature (confidence "full") — a suppressed-looking
   *  reading during the first couple weeks is just as likely to be baseline noise. */
  flagged: boolean;
  confidence: "insufficient" | "building" | "full";
  /** Human-readable reasons, most-significant first. Empty when not flagged. */
  reasons: string[];
}

const BASELINE_WINDOW_DAYS = 14;
const MIN_NIGHTS_FOR_BUILDING = 3;
const MIN_NIGHTS_FOR_FULL = 14;
// Both must cross their own threshold — either signal alone is common day-to-day
// noise; both suppressed/elevated together is the classic "coming down with
// something" pattern (same idea as Oura's/Whoop's illness signals, minus the
// temperature input Google Health doesn't reliably expose — see ingest.ts).
const HRV_Z_THRESHOLD = -1.25;
const RHR_Z_THRESHOLD = 1.25;
const SPO2_Z_THRESHOLD = -1.25;
const MIN_SPO2_NIGHTS = 3;

/**
 * Flags a possible illness/atypical-recovery night: HRV suppressed AND resting HR
 * elevated, both relative to the same trailing 14-night baseline computeRecoveryScore
 * uses (lib/analytics/recovery-score.ts) — reuses that exact baseline-windowing
 * pattern intentionally, so "your baseline" means the same thing across both scores.
 * SpO2 is an optional third, corroborating-only reason (not required to flag, since
 * SpO2 syncing is sparser than HRV/RHR).
 */
export function computeIllnessSignal(
  history: IllnessNightlyMetrics[],
  tonight: IllnessNightlyMetrics,
  excludedDates?: Set<string>,
): IllnessSignalResult {
  const baseline = sortByDateAscending(history)
    .filter((n) => n.date < tonight.date && !excludedDates?.has(n.date))
    .slice(-BASELINE_WINDOW_DAYS);

  const hrvHistory = baseline.map((n) => n.hrv_rmssd).filter((v): v is number => v != null);
  const rhrHistory = baseline.map((n) => n.resting_hr).filter((v): v is number => v != null);

  const nightsUsed = Math.min(hrvHistory.length, rhrHistory.length);
  const confidence: IllnessSignalResult["confidence"] =
    nightsUsed >= MIN_NIGHTS_FOR_FULL ? "full" : nightsUsed >= MIN_NIGHTS_FOR_BUILDING ? "building" : "insufficient";

  if (confidence !== "full" || tonight.hrv_rmssd == null || tonight.resting_hr == null) {
    return { flagged: false, confidence, reasons: [] };
  }

  const hrvMean = mean(hrvHistory);
  const hrvZ = zScore(tonight.hrv_rmssd, hrvMean, stddev(hrvHistory, hrvMean));
  const rhrMean = mean(rhrHistory);
  const rhrZ = zScore(tonight.resting_hr, rhrMean, stddev(rhrHistory, rhrMean));

  const hrvSuppressed = hrvZ <= HRV_Z_THRESHOLD;
  const rhrElevated = rhrZ >= RHR_Z_THRESHOLD;
  const flagged = hrvSuppressed && rhrElevated;

  if (!flagged) {
    return { flagged: false, confidence, reasons: [] };
  }

  const reasons: string[] = [
    `Resting HR is ${Math.round(tonight.resting_hr - rhrMean)} bpm above your 14-night average`,
    `HRV is ${Math.round(hrvMean - tonight.hrv_rmssd)} ms below your 14-night average`,
  ];

  const spo2History = baseline.map((n) => n.spo2).filter((v): v is number => v != null);
  if (tonight.spo2 != null && spo2History.length >= MIN_SPO2_NIGHTS) {
    const spo2Mean = mean(spo2History);
    const spo2Z = zScore(tonight.spo2, spo2Mean, stddev(spo2History, spo2Mean));
    if (spo2Z <= SPO2_Z_THRESHOLD) {
      reasons.push(`SpO2 is also ${(spo2Mean - tonight.spo2).toFixed(1)}% below your average`);
    }
  }

  return { flagged, confidence, reasons };
}
