/** Arithmetic mean of a non-empty array. */
export function mean(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/** Population standard deviation. Returns 0 for fewer than 2 values (no spread to measure). */
export function stddev(values: number[], avg: number): number {
  if (values.length < 2) return 0;
  const variance = values.reduce((sum, v) => sum + (v - avg) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

/** How many standard deviations `value` is above `avg` (negative if below). */
export function zScore(value: number, avg: number, std: number): number {
  return (value - avg) / Math.max(std, 1e-6);
}

/** The item maximizing `selector`, skipping items whose selector is null. Null if none qualify. */
export function maxBy<T>(items: T[], selector: (item: T) => number | null): T | null {
  let best: T | null = null;
  let bestValue = -Infinity;
  for (const item of items) {
    const value = selector(item);
    if (value == null) continue;
    if (best == null || value > bestValue) {
      best = item;
      bestValue = value;
    }
  }
  return best;
}

/**
 * Returns a new array sorted by `date` ascending (oldest first); the input is left
 * untouched. Every baseline-windowing function below (recovery/illness/sleep-score/
 * biological-age/VO2max) does `history.filter(...).slice(-N)` to grab the N most
 * recent prior nights — that only means "most recent" if `history` is ascending, so
 * each one sorts with this first rather than trusting the caller's fetch order. Two
 * page components independently got this wrong by passing a descending-fetched array
 * straight through, silently using the OLDEST N nights in the window instead of the
 * most recent N — sorting defensively here closes off that whole class of mistake.
 */
export function sortByDateAscending<T extends { date: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

/** The item minimizing `selector`, skipping items whose selector is null. Null if none qualify. */
export function minBy<T>(items: T[], selector: (item: T) => number | null): T | null {
  let best: T | null = null;
  let bestValue = Infinity;
  for (const item of items) {
    const value = selector(item);
    if (value == null) continue;
    if (best == null || value < bestValue) {
      best = item;
      bestValue = value;
    }
  }
  return best;
}
