import { describe, expect, it } from "vitest";
import { computeSleepTarget, type SleepNight } from "@/lib/analytics/sleep-debt";

describe("computeSleepTarget", () => {
  it("defaults to the 8h baseline with no history and no strain", () => {
    const result = computeSleepTarget([], null);
    expect(result.debtMinutes).toBe(0);
    expect(result.targetMinutes).toBe(480);
    expect(result.baselineMinutes).toBe(480);
  });

  it("treats nights with no data as zero debt rather than penalizing", () => {
    const nights: SleepNight[] = [{ date: "2026-09-01", total_sleep_minutes: null }, { date: "2026-09-02", total_sleep_minutes: null }];
    const result = computeSleepTarget(nights, null);
    expect(result.debtMinutes).toBe(0);
    expect(result.targetMinutes).toBe(480);
  });

  it("accumulates debt across nights short of the baseline and repays 1/3 of it", () => {
    const nights: SleepNight[] = [
      { date: "2026-09-01", total_sleep_minutes: 420 }, // 60 short
      { date: "2026-09-02", total_sleep_minutes: 420 }, // 60 short
      { date: "2026-09-03", total_sleep_minutes: 420 }, // 60 short
    ];
    const result = computeSleepTarget(nights, null);
    expect(result.debtMinutes).toBe(180);
    expect(result.targetMinutes).toBe(480 + 60); // 180 * 1/3 = 60 repayment
  });

  it("does not credit oversleeping toward negative debt", () => {
    const nights: SleepNight[] = [{ date: "2026-09-01", total_sleep_minutes: 600 }];
    const result = computeSleepTarget(nights, null);
    expect(result.debtMinutes).toBe(0);
  });

  it("caps debt repayment at MAX_DEBT_REPAYMENT_MINUTES even with a huge debt", () => {
    const nights: SleepNight[] = [
      { date: "2026-09-01", total_sleep_minutes: 240 }, // 240 short
      { date: "2026-09-02", total_sleep_minutes: 240 },
      { date: "2026-09-03", total_sleep_minutes: 240 },
    ];
    const result = computeSleepTarget(nights, null);
    expect(result.debtMinutes).toBe(720);
    expect(result.targetMinutes).toBe(600); // 480 + min(720/3=240, 120) = 600, at the max clamp
  });

  it("adds an exertion penalty scaled by today's strain", () => {
    const result = computeSleepTarget([], 10);
    expect(result.targetMinutes).toBe(480 + 10 * 1.26);
  });

  it("clamps the target at MAX_TARGET_MINUTES for very high strain", () => {
    const result = computeSleepTarget([], 100);
    expect(result.targetMinutes).toBe(600);
  });
});
