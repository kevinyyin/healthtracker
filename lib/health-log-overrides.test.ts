import { describe, expect, it } from "vitest";
import { applyOverrides, sleepStartIso, type HealthLogOverride } from "@/lib/health-log-overrides";

const TZ = "America/New_York";

function localDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: TZ });
}

describe("sleepStartIso", () => {
  it("treats a time-of-day at or after noon as the evening before the wake date", () => {
    expect(localDate(sleepStartIso("2026-09-04", "23:30", TZ))).toBe("2026-09-03");
  });

  it("treats a time-of-day before noon as an after-midnight bedtime on the wake date itself", () => {
    expect(localDate(sleepStartIso("2026-09-04", "00:15", TZ))).toBe("2026-09-04");
  });

  it("treats exactly noon as the day before (boundary is inclusive of noon)", () => {
    expect(localDate(sleepStartIso("2026-09-04", "12:00", TZ))).toBe("2026-09-03");
  });
});

function override(overrides: Partial<HealthLogOverride> = {}): HealthLogOverride {
  return {
    date: "2026-09-04",
    hrv_rmssd: null,
    resting_hr: null,
    spo2: null,
    total_sleep_minutes: null,
    deep_sleep_minutes: null,
    rem_sleep_minutes: null,
    light_sleep_minutes: null,
    awake_minutes: null,
    wake_count: null,
    sleep_latency_minutes: null,
    sleep_start: null,
    ...overrides,
  };
}

describe("applyOverrides", () => {
  it("merges non-null wake_count/sleep_latency_minutes/sleep_start onto a matching-date log", () => {
    const logs = [
      {
        date: "2026-09-04",
        wake_count: 5,
        sleep_latency_minutes: 40,
        sleep_start: "2026-09-04T02:00:00Z",
      },
    ];
    const result = applyOverrides(
      logs,
      [override({ wake_count: 2, sleep_latency_minutes: 12, sleep_start: "2026-09-03T23:30:00Z" })],
    );
    expect(result[0].wake_count).toBe(2);
    expect(result[0].sleep_latency_minutes).toBe(12);
    expect(result[0].sleep_start).toBe("2026-09-03T23:30:00Z");
  });

  it("leaves a field untouched when the override for it is null", () => {
    const logs = [{ date: "2026-09-04", wake_count: 5, sleep_latency_minutes: 40, sleep_start: "synced" }];
    const result = applyOverrides(logs, [override({ wake_count: 2 })]);
    expect(result[0].wake_count).toBe(2);
    expect(result[0].sleep_latency_minutes).toBe(40);
    expect(result[0].sleep_start).toBe("synced");
  });
});
