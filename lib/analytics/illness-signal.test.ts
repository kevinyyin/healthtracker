import { describe, expect, it } from "vitest";
import { daysBefore } from "@/lib/date";
import { computeIllnessSignal, type IllnessNightlyMetrics } from "@/lib/analytics/illness-signal";

const TONIGHT_DATE = "2026-09-12";

function night(date: string, overrides: Partial<IllnessNightlyMetrics> = {}): IllnessNightlyMetrics {
  return { date, hrv_rmssd: 50, resting_hr: 55, spo2: 97, ...overrides };
}

function stableHistory(count: number): IllnessNightlyMetrics[] {
  return Array.from({ length: count }, (_, i) => night(daysBefore(TONIGHT_DATE, i + 1)));
}

describe("computeIllnessSignal", () => {
  it("is not flagged with a stable baseline and a normal night", () => {
    const result = computeIllnessSignal(stableHistory(14), night(TONIGHT_DATE), new Set());
    expect(result.flagged).toBe(false);
    expect(result.confidence).toBe("full");
  });

  it("flags a night with both suppressed HRV and elevated resting HR", () => {
    const result = computeIllnessSignal(
      stableHistory(14),
      night(TONIGHT_DATE, { hrv_rmssd: 20, resting_hr: 75 }),
      new Set(),
    );
    expect(result.flagged).toBe(true);
    expect(result.reasons.length).toBeGreaterThan(0);
  });
});

describe("computeIllnessSignal — baseline is order-independent", () => {
  // Regression test: today/page.tsx fetches health_logs newest-first (descending)
  // and passes it straight through as `history`. computeIllnessSignal's own
  // `.filter(...).slice(-14)` only means "the 14 most recent prior nights" if
  // `history` is ascending — unsorted, it silently used the OLDEST 14 nights in the
  // fetched window instead.
  function nightsWithShiftedBaseline(): IllnessNightlyMetrics[] {
    const recent = Array.from({ length: 14 }, (_, i) => night(daysBefore(TONIGHT_DATE, i + 1)));
    // Stale nights already look "sick" (suppressed HRV/elevated RHR) — if the bug
    // mixes these into the baseline, they'd pull the baseline itself down/up rather
    // than being correctly excluded, masking tonight's real deviation.
    const stale = Array.from({ length: 5 }, (_, i) => night(daysBefore(TONIGHT_DATE, i + 15), { hrv_rmssd: 20, resting_hr: 75 }));
    return [...recent, ...stale];
  }

  it("flags tonight's genuine dip regardless of whether history is fed descending or ascending", () => {
    const sickTonight = night(TONIGHT_DATE, { hrv_rmssd: 20, resting_hr: 75 });
    const descending = [...nightsWithShiftedBaseline()].sort((a, b) => (a.date < b.date ? 1 : -1));
    const ascending = [...nightsWithShiftedBaseline()].sort((a, b) => (a.date < b.date ? -1 : 1));

    const descResult = computeIllnessSignal(descending, sickTonight, new Set());
    const ascResult = computeIllnessSignal(ascending, sickTonight, new Set());

    expect(descResult.flagged).toBe(true);
    expect(ascResult.flagged).toBe(true);
  });
});
