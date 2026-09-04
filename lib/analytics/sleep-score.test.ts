import { describe, expect, it } from "vitest";
import { daysBefore } from "@/lib/date";
import { computeSleepScore, type SleepNightMetrics } from "@/lib/analytics/sleep-score";

const TONIGHT_DATE = "2026-09-04";
const TARGET_MINUTES = 480;

/** A night with solid values across all 7 factors' underlying fields, so every
 *  factor scores non-null by default — individual tests null out one field at a
 *  time to isolate that factor's effect. */
function fullNight(overrides: Partial<SleepNightMetrics> = {}): SleepNightMetrics {
  return {
    date: TONIGHT_DATE,
    sleep_start: `${TONIGHT_DATE}T04:00:00Z`,
    total_sleep_minutes: 480,
    awake_minutes: 20,
    deep_sleep_minutes: 90,
    rem_sleep_minutes: 100,
    light_sleep_minutes: 270, // sums with the above to exactly 480 — no data gap
    wake_count: 1,
    sleep_latency_minutes: 15,
    ...overrides,
  };
}

/** `count` prior nights, all with a sleep_start, ending the day before `tonight`. */
function history(count: number, tonight: string = TONIGHT_DATE): SleepNightMetrics[] {
  return Array.from({ length: count }, (_, i) => {
    const date = daysBefore(tonight, i + 1);
    return fullNight({ date, sleep_start: `${date}T04:00:00Z` });
  });
}

function factor(result: ReturnType<typeof computeSleepScore>, key: string) {
  const f = result.factors.find((f) => f.key === key);
  if (!f) throw new Error(`factor ${key} not found`);
  return f;
}

describe("computeSleepScore — per-factor isolation", () => {
  it("total sleep factor scores 100 when time-in-bed matches target exactly", () => {
    const result = computeSleepScore(history(14), fullNight(), TARGET_MINUTES);
    expect(factor(result, "total_sleep").score).toBe(100);
  });

  it("nulling deep_sleep_minutes only nulls the Deep factor", () => {
    const result = computeSleepScore(history(14), fullNight({ deep_sleep_minutes: null }), TARGET_MINUTES);
    expect(factor(result, "deep").score).toBeNull();
    expect(factor(result, "rem").score).not.toBeNull();
    expect(factor(result, "efficiency").score).not.toBeNull();
    expect(factor(result, "total_sleep").score).not.toBeNull();
  });

  it("nulling rem_sleep_minutes only nulls the REM factor", () => {
    const result = computeSleepScore(history(14), fullNight({ rem_sleep_minutes: null }), TARGET_MINUTES);
    expect(factor(result, "rem").score).toBeNull();
    expect(factor(result, "deep").score).not.toBeNull();
  });

  it("nulling wake_count only nulls the Restfulness factor", () => {
    const result = computeSleepScore(history(14), fullNight({ wake_count: null }), TARGET_MINUTES);
    expect(factor(result, "restfulness").score).toBeNull();
    expect(factor(result, "efficiency").score).not.toBeNull();
  });

  it("nulling sleep_latency_minutes only nulls the Latency factor", () => {
    const result = computeSleepScore(history(14), fullNight({ sleep_latency_minutes: null }), TARGET_MINUTES);
    expect(factor(result, "latency").score).toBeNull();
    expect(factor(result, "total_sleep").score).not.toBeNull();
  });

  it("nulling total_sleep_minutes cascades to every trueAsleep-derived factor, but not Latency/Timing", () => {
    const result = computeSleepScore(history(14), fullNight({ total_sleep_minutes: null }), TARGET_MINUTES);
    expect(factor(result, "total_sleep").score).toBeNull();
    expect(factor(result, "efficiency").score).toBeNull();
    expect(factor(result, "restfulness").score).toBeNull();
    expect(factor(result, "rem").score).toBeNull();
    expect(factor(result, "deep").score).toBeNull();
    expect(factor(result, "latency").score).not.toBeNull();
    expect(factor(result, "timing").score).not.toBeNull();
  });

  it("nulling sleep_start only nulls the Timing factor", () => {
    const result = computeSleepScore(history(14), fullNight({ sleep_start: null }), TARGET_MINUTES);
    expect(factor(result, "timing").score).toBeNull();
    expect(factor(result, "total_sleep").score).not.toBeNull();
  });
});

describe("computeSleepScore — weight renormalization", () => {
  it("redistributes a null factor's weight across the remaining factors, summing to 100", () => {
    const result = computeSleepScore(history(14), fullNight({ deep_sleep_minutes: null }), TARGET_MINUTES);
    expect(factor(result, "deep").weight).toBe(0);
    const totalWeight = result.factors.reduce((sum, f) => sum + f.weight, 0);
    expect(totalWeight).toBeCloseTo(100, 5);
  });

  it("score is null only when every factor is null", () => {
    const emptyNight: SleepNightMetrics = {
      date: TONIGHT_DATE,
      sleep_start: null,
      total_sleep_minutes: null,
      awake_minutes: null,
      deep_sleep_minutes: null,
      rem_sleep_minutes: null,
      wake_count: null,
      sleep_latency_minutes: null,
    };
    const result = computeSleepScore([], emptyNight, TARGET_MINUTES);
    expect(result.score).toBeNull();
    expect(result.factors.every((f) => f.score === null && f.weight === 0)).toBe(true);
  });
});

describe("computeSleepScore — confidence tiers", () => {
  it("is 'insufficient' with fewer than 3 baseline nights", () => {
    expect(computeSleepScore(history(0), fullNight(), TARGET_MINUTES).confidence).toBe("insufficient");
    expect(computeSleepScore(history(2), fullNight(), TARGET_MINUTES).confidence).toBe("insufficient");
  });

  it("is 'building' between 3 and 13 baseline nights", () => {
    expect(computeSleepScore(history(3), fullNight(), TARGET_MINUTES).confidence).toBe("building");
    expect(computeSleepScore(history(13), fullNight(), TARGET_MINUTES).confidence).toBe("building");
  });

  it("is 'full' at 14+ baseline nights", () => {
    expect(computeSleepScore(history(14), fullNight(), TARGET_MINUTES).confidence).toBe("full");
    expect(computeSleepScore(history(20), fullNight(), TARGET_MINUTES).confidence).toBe("full");
  });
});

describe("computeSleepScore — data gap detection", () => {
  it("does not flag a fully-covered night", () => {
    const result = computeSleepScore(history(14), fullNight(), TARGET_MINUTES);
    expect(result.dataGapTonight).toBe(false);
    expect(result.confidence).toBe("full");
  });

  it("flags a night whose measured stage minutes fall short of its total span, and caps confidence at 'building'", () => {
    // measured = 90 + 100 + 20 + 200 = 410, total = 480 -> 70 min gap, over the 15 min threshold.
    const gappyNight = fullNight({ light_sleep_minutes: 200 });
    const result = computeSleepScore(history(14), gappyNight, TARGET_MINUTES);
    expect(result.dataGapTonight).toBe(true);
    expect(result.confidence).toBe("building");
  });

  it("does not flag a night short of coverage by less than the threshold", () => {
    // measured = 90 + 100 + 20 + 265 = 475, total = 480 -> only a 5 min shortfall.
    const result = computeSleepScore(history(14), fullNight({ light_sleep_minutes: 265 }), TARGET_MINUTES);
    expect(result.dataGapTonight).toBe(false);
  });

  it("does not flag a night with unknown light_sleep_minutes (Today page doesn't query it)", () => {
    const night = fullNight();
    delete night.light_sleep_minutes;
    const result = computeSleepScore(history(14), night, TARGET_MINUTES);
    expect(result.dataGapTonight).toBe(false);
    expect(result.confidence).toBe("full");
  });
});
