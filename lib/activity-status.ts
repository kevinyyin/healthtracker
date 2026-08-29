import { nextDayString } from "@/lib/date";

export const FLAGGED_STATUSES = [
  { key: "sick", label: "Sick" },
  { key: "injured", label: "Injured" },
  { key: "traveling", label: "Traveling" },
] as const;

export type FlaggedStatus = (typeof FLAGGED_STATUSES)[number]["key"];

/** "active" isn't a stored status — it means no flagged period is open. */
export type ActivityStatus = FlaggedStatus | "active";

export function isFlaggedStatus(value: string): value is FlaggedStatus {
  return FLAGGED_STATUSES.some((s) => s.key === value);
}

export function statusLabel(status: ActivityStatus): string {
  if (status === "active") return "Active";
  return FLAGGED_STATUSES.find((s) => s.key === status)?.label ?? status;
}

export interface StatusPeriodRow {
  status: string;
  started_on: string;
  ended_on: string | null;
}

/**
 * Expands status periods into the set of individual dates flagged Sick/Injured/
 * Traveling, for excluding from rolling analytics baselines. An open period
 * (ended_on is null) is treated as running through `throughDate`.
 */
export function excludedDatesFromPeriods(periods: StatusPeriodRow[], throughDate: string): Set<string> {
  const excluded = new Set<string>();

  for (const period of periods) {
    let date = period.started_on;
    const end = period.ended_on ?? throughDate;
    while (date <= end) {
      excluded.add(date);
      date = nextDayString(date);
    }
  }

  return excluded;
}
