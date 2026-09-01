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
