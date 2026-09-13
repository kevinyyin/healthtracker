// Pure unit-conversion/formatting helpers, split out from lib/units.ts so client
// components (e.g. a weight-entry form) can import them without pulling in that
// module's "server-only" guard (needed there only by getUserUnitSystem, which reads
// the DB).

export type UnitSystem = "metric" | "imperial";

const METERS_PER_MILE = 1609.344;
const KG_PER_LB = 0.45359237;

/** Formats a distance in meters as "2.34 km" or "1.45 mi" depending on unit system. */
export function formatDistance(meters: number, system: UnitSystem): string {
  if (system === "imperial") {
    return `${(meters / METERS_PER_MILE).toFixed(2)} mi`;
  }
  return `${(meters / 1000).toFixed(2)} km`;
}

/** Formats a weight stored in kg (the canonical storage unit) as "72.5 kg" or "159.8 lb". */
export function formatWeight(kg: number, system: UnitSystem): string {
  if (system === "imperial") {
    return `${(kg / KG_PER_LB).toFixed(1)} lb`;
  }
  return `${kg.toFixed(1)} kg`;
}

/** Converts a weight entered in the user's display unit back to kg for storage. */
export function toKg(value: number, system: UnitSystem): number {
  return system === "imperial" ? value * KG_PER_LB : value;
}

/** Converts a weight stored in kg to the user's display unit (the numeric inverse of formatWeight). */
export function fromKg(kg: number, system: UnitSystem): number {
  return system === "imperial" ? kg / KG_PER_LB : kg;
}
