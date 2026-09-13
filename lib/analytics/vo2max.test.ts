import { describe, expect, it } from "vitest";
import { computeVo2Max, computeVo2MaxTrend, type Vo2MaxNightlyMetrics } from "@/lib/analytics/vo2max";

function nights(count: number, restingHr: number, startDate = "2026-08-01"): Vo2MaxNightlyMetrics[] {
  const start = new Date(`${startDate}T00:00:00Z`);
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);
    return { date: d.toISOString().slice(0, 10), resting_hr: restingHr };
  });
}

describe("computeVo2Max", () => {
  it("is insufficient with fewer than 7 nights of resting HR", () => {
    const history = nights(6, 55);
    const result = computeVo2Max(history, "2026-08-10", 190);
    expect(result.vo2max).toBeNull();
    expect(result.confidence).toBe("insufficient");
    expect(result.nightsUsed).toBe(6);
  });

  it("computes the Uth et al. formula once baseline is met, at 'building' confidence", () => {
    const history = nights(7, 50);
    const result = computeVo2Max(history, "2026-08-10", 190);
    expect(result.confidence).toBe("building");
    expect(result.nightsUsed).toBe(7);
    expect(result.restingHrBaseline).toBe(50);
    expect(result.vo2max).toBeCloseTo(15.3 * (190 / 50), 5);
  });

  it("reaches 'full' confidence at 30 nights", () => {
    const history = nights(30, 55);
    const result = computeVo2Max(history, "2026-08-31", 190);
    expect(result.confidence).toBe("full");
    expect(result.nightsUsed).toBe(30);
  });

  it("only uses the trailing 30-night window even with more history available", () => {
    const history = nights(45, 55);
    const result = computeVo2Max(history, "2026-09-15", 190);
    expect(result.nightsUsed).toBe(30);
  });

  it("clamps to the plausible max for an extremely low resting HR baseline", () => {
    const history = nights(10, 20);
    const result = computeVo2Max(history, "2026-08-11", 220);
    expect(result.vo2max).toBe(70);
  });

  it("clamps to the plausible min for an extremely high resting HR baseline", () => {
    const history = nights(10, 120);
    const result = computeVo2Max(history, "2026-08-11", 150);
    expect(result.vo2max).toBe(20);
  });

  it("skips excluded dates when building the baseline", () => {
    const history = nights(10, 55);
    // Flag 4 of the 10 nights as excluded (e.g. traveling) — should drop below the
    // 7-night threshold even though 10 rows of data exist.
    const excluded = new Set(history.slice(0, 4).map((n) => n.date));
    const result = computeVo2Max(history, "2026-08-11", 190, excluded);
    expect(result.nightsUsed).toBe(6);
    expect(result.confidence).toBe("insufficient");
  });
});

describe("computeVo2Max — baseline is order-independent", () => {
  // Regression test: today/page.tsx and cardio-fitness/page.tsx build this history
  // from health_logs queries that may not be pre-sorted the way computeVo2Max's own
  // `.filter(...).slice(-30)` needs (ascending) — the fix sorts internally, so the
  // caller's order must not change the result.
  it("produces the identical result whether history is fed ascending or descending", () => {
    const ascending = nights(35, 55);
    const descending = [...ascending].sort((a, b) => (a.date < b.date ? 1 : -1));

    const ascResult = computeVo2Max(ascending, "2026-09-15", 190);
    const descResult = computeVo2Max(descending, "2026-09-15", 190);

    expect(descResult.restingHrBaseline).toBe(ascResult.restingHrBaseline);
    expect(descResult.vo2max).toBeCloseTo(ascResult.vo2max!, 10);
  });
});

describe("computeVo2MaxTrend", () => {
  it("recomputes per day using only strictly-earlier nights as baseline", () => {
    const history = nights(40, 55);
    const trend = computeVo2MaxTrend(history, 190, 90);
    expect(trend).toHaveLength(40);
    // First entries have no prior history at all -> insufficient -> null.
    expect(trend[0].vo2max).toBeNull();
    // By the end, 30+ prior nights exist -> a value is produced.
    expect(trend[trend.length - 1].vo2max).not.toBeNull();
  });
});
