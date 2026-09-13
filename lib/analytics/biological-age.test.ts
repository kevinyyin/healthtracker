import { describe, expect, it } from "vitest";
import { daysBefore } from "@/lib/date";
import { computeBiologicalAge, type BioAgeNightlyMetrics } from "@/lib/analytics/biological-age";

const AS_OF_DATE = "2026-09-12";

function night(date: string, overrides: Partial<BioAgeNightlyMetrics> = {}): BioAgeNightlyMetrics {
  return {
    date,
    hrv_rmssd: 45,
    resting_hr: 63,
    deep_sleep_minutes: 90,
    total_sleep_minutes: 480,
    ...overrides,
  };
}

describe("computeBiologicalAge — baseline is order-independent", () => {
  // Regression test: computeBiologicalAge's own `.filter(...).slice(-30)` only means
  // "the 30 most recent prior nights" if `history` is ascending. The fix sorts
  // internally, so a caller that (mistakenly, as today/page.tsx's sibling functions
  // did) passes a descending-fetched array must still get the correct baseline.
  it("produces the identical result whether history is fed ascending or descending", () => {
    const ascending = Array.from({ length: 40 }, (_, i) => night(daysBefore(AS_OF_DATE, 40 - i)));
    const descending = [...ascending].sort((a, b) => (a.date < b.date ? 1 : -1));

    const ascResult = computeBiologicalAge(ascending, AS_OF_DATE, 35, "male");
    const descResult = computeBiologicalAge(descending, AS_OF_DATE, 35, "male");

    expect(descResult.nightsUsed).toBe(ascResult.nightsUsed);
    expect(descResult.bioAge).toBeCloseTo(ascResult.bioAge!, 10);
  });
});
