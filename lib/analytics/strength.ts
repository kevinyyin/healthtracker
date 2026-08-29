export interface LoggedSet {
  exercise_name: string;
  reps: number;
  weight_kg: number;
  volume: number;
}

export interface SessionSummary {
  totalVolume: number;
  byExercise: Record<string, number>;
  estimatedStrain: number;
}

const VOLUME_TO_STRAIN_DIVISOR = 500;
const MAX_STRAIN = 21;

/**
 * Total volume load and a rough Strain contribution for a lifting session, so
 * strength work can register on the daily Strain scale without needing HR-zone data.
 * The divisor is a placeholder starting point, not a validated conversion.
 */
export function summarizeSession(sets: LoggedSet[]): SessionSummary {
  const byExercise: Record<string, number> = {};
  let totalVolume = 0;

  for (const set of sets) {
    totalVolume += set.volume;
    byExercise[set.exercise_name] = (byExercise[set.exercise_name] ?? 0) + set.volume;
  }

  const estimatedStrain = Math.min(MAX_STRAIN, totalVolume / VOLUME_TO_STRAIN_DIVISOR);

  return { totalVolume, byExercise, estimatedStrain };
}
