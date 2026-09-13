import { describe, expect, it } from "vitest";
import { DEFAULT_MAX_HR, resolveMaxHr } from "@/lib/analytics/day-strain";

describe("resolveMaxHr", () => {
  it("uses the manual override when set, regardless of dob", () => {
    expect(resolveMaxHr("1990-01-01", "2026-09-12", 180)).toBe(180);
  });

  it("falls back to 220 minus age when no override is set", () => {
    // Born 2001-06-15, as-of 2026-09-12 -> age 25 -> 220 - 25 = 195
    expect(resolveMaxHr("2001-06-15", "2026-09-12", null)).toBe(195);
  });

  it("falls back to DEFAULT_MAX_HR when there's no dob and no override", () => {
    expect(resolveMaxHr(null, "2026-09-12", null)).toBe(DEFAULT_MAX_HR);
  });
});
