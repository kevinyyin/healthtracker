export interface StressMinute {
  minute: string;
  bpm: number | null;
  inWorkout: boolean;
}

export interface StressPoint {
  minute: string;
  stress: number | null;
}

const EXCESS_HR_FOR_MAX_STRESS = 40; // bpm above resting HR treated as 100% stress

/**
 * Physiological stress from non-workout HR elevation above resting HR. Workout
 * minutes are excluded (elevated HR there is expected exertion, not stress).
 *
 * Note: the spec calls for combining this with continuous daytime "micro-HRV," but
 * Fitbit/Google Health doesn't expose continuous HRV to third parties — only one
 * nocturnal HRV reading per night is available. That term is intentionally dropped
 * here rather than faked; this is HR-elevation-only, a real scope reduction.
 */
export function computeStressTimeline(minutes: StressMinute[], restingHr: number | null): StressPoint[] {
  return minutes.map(({ minute, bpm, inWorkout }) => {
    if (inWorkout || bpm == null || restingHr == null) {
      return { minute, stress: null };
    }
    const excess = Math.max(0, bpm - restingHr);
    const stress = Math.min(100, Math.max(0, (excess / EXCESS_HR_FOR_MAX_STRESS) * 100));
    return { minute, stress };
  });
}
