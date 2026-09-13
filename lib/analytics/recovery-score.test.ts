import { describe, expect, it } from "vitest";
import { daysBefore } from "@/lib/date";
import { computeRecoveryScore, type NightlyMetrics } from "@/lib/analytics/recovery-score";

const TONIGHT_DATE = "2026-09-12";

function night(date: string, overrides: Partial<NightlyMetrics> = {}): NightlyMetrics {
  return { date, hrv_rmssd: 50, resting_hr: 55, ...overrides };
}

describe("computeRecoveryScore", () => {
  it("is insufficient with fewer than 3 baseline nights", () => {
    const result = computeRecoveryScore([night(daysBefore(TONIGHT_DATE, 1))], night(TONIGHT_DATE), new Set());
    expect(result.score).toBeNull();
    expect(result.confidence).toBe("insufficient");
  });

  it("scores above 50 when HRV is above and RHR is below the baseline", () => {
    const history = Array.from({ length: 14 }, (_, i) => night(daysBefore(TONIGHT_DATE, i + 1)));
    const result = computeRecoveryScore(history, night(TONIGHT_DATE, { hrv_rmssd: 65, resting_hr: 48 }), new Set());
    expect(result.score).not.toBeNull();
    expect(result.score!).toBeGreaterThan(50);
    expect(result.confidence).toBe("full");
  });
});

describe("computeRecoveryScore — baseline is order-independent", () => {
  // Regression test: today/page.tsx fetches health_logs newest-first (descending)
  // and passes it straight through as `history`. computeRecoveryScore's own
  // `.filter(...).slice(-14)` only means "the 14 most recent prior nights" if
  // `history` is ascending — unsorted, it silently used the OLDEST 14 nights in the
  // fetched window instead, skipping the 5 most recent ones entirely.
  function nightsWithShiftedBaseline(): NightlyMetrics[] {
    // 1-14 days ago: the TRUE recent baseline (HRV 50 / RHR 55, same as tonight ->
    // should score close to neutral/50).
    const recent = Array.from({ length: 14 }, (_, i) => night(daysBefore(TONIGHT_DATE, i + 1)));
    // 15-19 days ago: a very different, stale baseline that must be excluded.
    const stale = Array.from({ length: 5 }, (_, i) => night(daysBefore(TONIGHT_DATE, i + 15), { hrv_rmssd: 20, resting_hr: 80 }));
    return [...recent, ...stale];
  }

  it("uses only the 14 most recent nights when history is fed descending (as the real page does)", () => {
    const descending = [...nightsWithShiftedBaseline()].sort((a, b) => (a.date < b.date ? 1 : -1));
    const result = computeRecoveryScore(descending, night(TONIGHT_DATE), new Set());
    // Tonight matches the true recent baseline exactly -> z-score ~0 -> score ~50.
    // The bug would have mixed in the 5 stale nights, skewing the baseline and
    // pushing tonight's score well above 50 (looks artificially "recovered").
    expect(result.score!).toBeGreaterThan(45);
    expect(result.score!).toBeLessThan(55);
  });

  it("produces the identical result when history is fed ascending", () => {
    const ascending = [...nightsWithShiftedBaseline()].sort((a, b) => (a.date < b.date ? -1 : 1));
    const descending = [...nightsWithShiftedBaseline()].sort((a, b) => (a.date < b.date ? 1 : -1));
    const ascResult = computeRecoveryScore(ascending, night(TONIGHT_DATE), new Set());
    const descResult = computeRecoveryScore(descending, night(TONIGHT_DATE), new Set());
    expect(ascResult.score).toBeCloseTo(descResult.score!, 10);
  });
});
