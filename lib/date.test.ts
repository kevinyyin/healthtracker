import { describe, expect, it } from "vitest";
import { localDateTimeToIso, localDayStartIso } from "@/lib/date";

function localHourMinute(iso: string, timezone: string): string {
  return new Date(iso).toLocaleString("en-US", { timeZone: timezone, hour12: false, hour: "2-digit", minute: "2-digit" });
}

describe("localDateTimeToIso", () => {
  it("matches localDayStartIso when given 00:00 (localDayStartIso delegates to it)", () => {
    expect(localDateTimeToIso("2026-09-04", "00:00", "America/New_York")).toBe(
      localDayStartIso("2026-09-04", "America/New_York"),
    );
  });

  it("round-trips a wall-clock time in America/New_York", () => {
    const iso = localDateTimeToIso("2026-09-04", "23:30", "America/New_York");
    expect(localHourMinute(iso, "America/New_York")).toBe("23:30");
  });

  it("round-trips a wall-clock time in a different timezone (Asia/Tokyo)", () => {
    const iso = localDateTimeToIso("2026-09-04", "07:15", "Asia/Tokyo");
    expect(localHourMinute(iso, "Asia/Tokyo")).toBe("07:15");
  });
});
