// Split out from alerts.ts so this pure check can be unit-tested without pulling in
// that file's DB/push-sending imports (which transitively touch lib/env.ts's
// zod-validated schema — fine under Next.js, which loads .env.local automatically,
// but vitest doesn't, so importing them from a test throws).

/** True only when the condition is met and today hasn't already alerted. */
export function shouldAlert(today: string, lastAlertDate: string | null, conditionMet: boolean): boolean {
  return conditionMet && lastAlertDate !== today;
}
