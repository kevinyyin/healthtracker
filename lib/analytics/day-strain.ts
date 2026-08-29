export interface HrSample {
  recorded_at: string;
  bpm: number;
}

/** HR zones as fractions of max HR, with exponentially increasing strain weight. */
export const HR_ZONES = [
  { zone: 1, min: 0.5, max: 0.6, weight: 2 },
  { zone: 2, min: 0.6, max: 0.7, weight: 4 },
  { zone: 3, min: 0.7, max: 0.8, weight: 8 },
  { zone: 4, min: 0.8, max: 0.9, weight: 16 },
  { zone: 5, min: 0.9, max: 1.01, weight: 32 },
] as const;

export const DEFAULT_MAX_HR = 202; // 220 - age(18)

/** Returns 0 (below Zone 1) through 5 for a given bpm relative to max HR. */
export function hrZone(bpm: number, maxHr: number = DEFAULT_MAX_HR): 0 | 1 | 2 | 3 | 4 | 5 {
  const pct = bpm / maxHr;
  for (const z of HR_ZONES) {
    if (pct >= z.min && pct < z.max) return z.zone;
  }
  return 0;
}

function zoneWeight(zone: 0 | 1 | 2 | 3 | 4 | 5): number {
  if (zone === 0) return 0;
  return HR_ZONES[zone - 1].weight;
}

const STRAIN_SCALE = 21;
const STRAIN_K = 750;

export interface DayStrainResult {
  strain: number;
  zoneMinutes: Record<number, number>;
  sampleCount: number;
}

/**
 * Sums exponentially-weighted HR-zone minutes across the day, then squashes the total
 * onto a 0-21 scale that approaches (but never quite reaches) 21 — matching the
 * asymptotic feel of a bounded strain score under sustained high-zone effort.
 */
export function computeDayStrain(samples: HrSample[], maxHr: number = DEFAULT_MAX_HR): DayStrainResult {
  const zoneMinutes: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let rawPoints = 0;

  for (const sample of samples) {
    const zone = hrZone(sample.bpm, maxHr);
    zoneMinutes[zone] += 1;
    rawPoints += zoneWeight(zone);
  }

  const strain = STRAIN_SCALE * (1 - Math.exp(-rawPoints / STRAIN_K));

  return { strain, zoneMinutes, sampleCount: samples.length };
}

export interface StrainTarget {
  min: number;
  max: number;
  label: string;
}

/** Suggests a target Strain range for today based on last night's Recovery Score. */
export function recommendTargetStrain(recovery: number | null): StrainTarget {
  if (recovery == null) {
    return { min: 10.0, max: 14.0, label: "Building baseline, moderate effort suggested" };
  }
  if (recovery < 34) {
    return { min: 6.0, max: 9.0, label: "Low recovery, take it easy" };
  }
  if (recovery < 67) {
    return { min: 10.0, max: 14.0, label: "Moderate recovery, steady effort" };
  }
  return { min: 15.0, max: 18.0, label: "High recovery, push today" };
}
