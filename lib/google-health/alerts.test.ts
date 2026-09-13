import { describe, expect, it } from "vitest";
import { shouldAlert } from "@/lib/google-health/alert-dedupe";

describe("shouldAlert", () => {
  it("returns false when the condition isn't met", () => {
    expect(shouldAlert("2026-09-12", null, false)).toBe(false);
  });

  it("returns true when the condition is met and never alerted before", () => {
    expect(shouldAlert("2026-09-12", null, true)).toBe(true);
  });

  it("returns false when already alerted today", () => {
    expect(shouldAlert("2026-09-12", "2026-09-12", true)).toBe(false);
  });

  it("returns true when the last alert was on a previous day", () => {
    expect(shouldAlert("2026-09-12", "2026-09-11", true)).toBe(true);
  });
});
