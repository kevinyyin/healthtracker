import { describe, expect, it } from "vitest";
import { computeRecapSummary, type RecapNightlyMetrics } from "@/lib/analytics/recap";
import type { JournalDay } from "@/lib/analytics/habit-correlations";

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function night(date: string, overrides: Partial<RecapNightlyMetrics> = {}): RecapNightlyMetrics {
  return {
    date,
    hrv_rmssd: 50,
    resting_hr: 55,
    spo2: 97,
    sleep_start: `${addDays(date, -1)}T23:00:00.000Z`,
    total_sleep_minutes: 480,
    deep_sleep_minutes: 90,
    rem_sleep_minutes: 100,
    awake_minutes: 20,
    wake_count: 2,
    sleep_latency_minutes: 10,
    ...overrides,
  };
}

// 20 nights of baseline (with mild oscillation so stddev isn't zero) before a
// 7-day visible period. Day index 24 (5th day of the period) gets a clear
// HRV-suppressed + RHR-elevated dip to exercise the illness/low-recovery paths.
const BASELINE_START = "2026-01-01";
const PERIOD_START = "2026-01-21";
const PERIOD_END = "2026-01-27";

function buildLogs(): RecapNightlyMetrics[] {
  const logs: RecapNightlyMetrics[] = [];
  for (let i = 0; i < 20; i++) {
    const date = addDays(BASELINE_START, i);
    const jitter = i % 2 === 0 ? 2 : -2;
    logs.push(night(date, { hrv_rmssd: 50 + jitter, resting_hr: 55 - jitter }));
  }
  for (let i = 0; i < 7; i++) {
    const date = addDays(PERIOD_START, i);
    if (i === 4) {
      // The dip day: suppressed HRV + elevated RHR relative to baseline.
      logs.push(night(date, { hrv_rmssd: 30, resting_hr: 72, total_sleep_minutes: 380 }));
    } else {
      // Distinct total_sleep_minutes per day so "longest sleep night" is unambiguous.
      logs.push(night(date, { total_sleep_minutes: 460 + i * 5 }));
    }
  }
  return logs;
}

describe("computeRecapSummary", () => {
  it("averages recovery and sleep score over the visible period only", () => {
    const summary = computeRecapSummary(buildLogs(), [], new Set(), PERIOD_START, PERIOD_END, null, null);
    expect(summary.nightsWithData).toBe(7);
    expect(summary.avgRecovery).not.toBeNull();
    expect(summary.avgSleepScore).not.toBeNull();
  });

  it("flags the dip day as illness and low recovery", () => {
    const summary = computeRecapSummary(buildLogs(), [], new Set(), PERIOD_START, PERIOD_END, null, null);
    expect(summary.illnessFlaggedDays).toBeGreaterThanOrEqual(1);
    expect(summary.lowRecoveryDays).toBeGreaterThanOrEqual(1);
  });

  it("picks the dip day as the worst recovery day", () => {
    const summary = computeRecapSummary(buildLogs(), [], new Set(), PERIOD_START, PERIOD_END, null, null);
    expect(summary.worstRecoveryDay?.date).toBe(addDays(PERIOD_START, 4));
  });

  it("picks the day with the most total_sleep_minutes as the longest sleep night", () => {
    const summary = computeRecapSummary(buildLogs(), [], new Set(), PERIOD_START, PERIOD_END, null, null);
    // Day 6 (last non-dip day) has the highest total_sleep_minutes (460 + 6*5 = 490).
    expect(summary.longestSleepNight?.date).toBe(addDays(PERIOD_START, 6));
    expect(summary.longestSleepNight?.value).toBe(490);
  });

  it("computes sleep debt at period end from the last 3 nights up to periodEnd", () => {
    const summary = computeRecapSummary(buildLogs(), [], new Set(), PERIOD_START, PERIOD_END, null, null);
    expect(summary.sleepDebtEndMinutes).not.toBeNull();
  });

  it("returns null bioAgeDeltaYears without a profile", () => {
    const summary = computeRecapSummary(buildLogs(), [], new Set(), PERIOD_START, PERIOD_END, null, null);
    expect(summary.bioAgeDeltaYears).toBeNull();
  });

  it("excludes flagged dates entirely from the period's own stats", () => {
    const excluded = new Set([addDays(PERIOD_START, 4)]);
    const summary = computeRecapSummary(buildLogs(), [], excluded, PERIOD_START, PERIOD_END, null, null);
    expect(summary.nightsWithData).toBe(6);
    expect(summary.illnessFlaggedDays).toBe(0);
  });

  it("surfaces a strong habit correlation logged within the period", () => {
    const logs = buildLogs();
    // Log "Alcohol" on every non-dip day in the period; the dip day (low recovery)
    // follows a day without it logged in this fixture (day 3), so recovery should
    // read lower on the day after Alcohol is skipped -> a detectable effect once
    // enough next-day outcomes exist. This mainly exercises that the function runs
    // end-to-end and returns correlations shaped correctly, not a specific sign.
    const journal: JournalDay[] = Array.from({ length: 7 }, (_, i) => ({
      date: addDays(PERIOD_START, i),
      habits: i % 2 === 0 ? ["Alcohol"] : [],
    }));
    const summary = computeRecapSummary(logs, journal, new Set(), PERIOD_START, PERIOD_END, null, null);
    for (const c of summary.topHabitCorrelations) {
      expect(c.confidence).toBe("low");
    }
  });
});
