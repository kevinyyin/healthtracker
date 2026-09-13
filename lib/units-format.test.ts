import { describe, expect, it } from "vitest";
import { formatWeight, toKg, fromKg } from "@/lib/units-format";

describe("formatWeight", () => {
  it("formats metric as kg to one decimal", () => {
    expect(formatWeight(72.456, "metric")).toBe("72.5 kg");
  });

  it("formats imperial as lb to one decimal", () => {
    expect(formatWeight(72.5, "imperial")).toBe("159.8 lb");
  });
});

describe("toKg / fromKg round-trip", () => {
  it("is a no-op for metric", () => {
    expect(toKg(72.5, "metric")).toBe(72.5);
    expect(fromKg(72.5, "metric")).toBe(72.5);
  });

  it("round-trips a value through imperial without meaningful drift", () => {
    const original = 165; // lb
    const kg = toKg(original, "imperial");
    const back = fromKg(kg, "imperial");
    expect(back).toBeCloseTo(original, 6);
  });
});
