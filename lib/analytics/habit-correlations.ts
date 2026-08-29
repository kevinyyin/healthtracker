import { nextDayString } from "@/lib/date";

export interface JournalDay {
  date: string;
  habits: string[];
}

export interface OutcomeDay {
  date: string;
  recovery: number | null;
  deepSleepMinutes: number | null;
}

export interface HabitCorrelation {
  habit: string;
  outcome: "recovery" | "deep_sleep";
  effect: number;
  nWith: number;
  nWithout: number;
  confidence: "low" | "insufficient";
}

const MIN_GROUP_SIZE = 3;

function mean(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * For each habit tag, compares the outcome the NEXT day (recovery / deep sleep) on
 * days it was logged vs days it wasn't. The mean difference between groups is
 * mathematically the OLS coefficient of a simple linear regression on a single binary
 * dummy variable — real regression, deliberately kept this simple because a
 * multivariate model would be meaningless at single-user sample sizes.
 *
 * Every result is gated at a minimum group size and labeled "low" confidence, never
 * implying more statistical rigor than a handful of data points can support.
 */
export function computeHabitCorrelations(journal: JournalDay[], outcomes: OutcomeDay[]): HabitCorrelation[] {
  const outcomeByDate = new Map(outcomes.map((o) => [o.date, o]));
  const allHabits = new Set(journal.flatMap((j) => j.habits));

  const results: HabitCorrelation[] = [];

  for (const habit of allHabits) {
    for (const outcomeKey of ["recovery", "deep_sleep"] as const) {
      const withValues: number[] = [];
      const withoutValues: number[] = [];

      for (const day of journal) {
        // Habits are logged for a date; their effect is measured on the NEXT day's outcome.
        const outcome = outcomeByDate.get(nextDayString(day.date));
        const value = outcomeKey === "recovery" ? outcome?.recovery : outcome?.deepSleepMinutes;
        if (value == null) continue;

        if (day.habits.includes(habit)) {
          withValues.push(value);
        } else {
          withoutValues.push(value);
        }
      }

      if (withValues.length === 0 && withoutValues.length === 0) continue;

      const confidence: HabitCorrelation["confidence"] =
        withValues.length >= MIN_GROUP_SIZE && withoutValues.length >= MIN_GROUP_SIZE ? "low" : "insufficient";

      const effect = confidence === "low" ? mean(withValues) - mean(withoutValues) : 0;

      results.push({
        habit,
        outcome: outcomeKey,
        effect,
        nWith: withValues.length,
        nWithout: withoutValues.length,
        confidence,
      });
    }
  }

  return results;
}
