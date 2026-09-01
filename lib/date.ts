/** Fallback used only when a user has no saved profile yet — see lib/timezone.ts. */
export const DEFAULT_TIMEZONE = "America/New_York";

/** Local calendar date (YYYY-MM-DD) for an ISO timestamp, in the given timezone. */
export function localDateString(iso: string, timezone: string = DEFAULT_TIMEZONE): string {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: timezone });
}

/** Today's local calendar date (YYYY-MM-DD) in the given timezone. */
export function todayLocalDateString(timezone: string = DEFAULT_TIMEZONE): string {
  return localDateString(new Date().toISOString(), timezone);
}

/** N days before a YYYY-MM-DD date string, as a YYYY-MM-DD string. */
export function daysBefore(dateString: string, days: number): string {
  const d = new Date(`${dateString}T12:00:00`);
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

/** The calendar day after a YYYY-MM-DD date string. */
export function nextDayString(dateString: string): string {
  return daysBefore(dateString, -1);
}

/** Minutes that the timezone's wall clock reads ahead of UTC at the given instant (negative west of UTC). */
function tzOffsetMinutes(instant: Date, timezone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
    .formatToParts(instant)
    .reduce<Record<string, string>>((acc, p) => {
      acc[p.type] = p.value;
      return acc;
    }, {});

  const asIfUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return (asIfUtc - instant.getTime()) / 60_000;
}

/**
 * The UTC instant (ISO string) of local midnight in the given timezone on the given
 * YYYY-MM-DD date. Approximates the DST offset using midnight UTC as the reference
 * instant — off by at most an hour on the two DST-transition days per year, which is
 * an acceptable simplification for a personal dashboard.
 */
export function localDayStartIso(dateString: string, timezone: string = DEFAULT_TIMEZONE): string {
  const utcMidnightGuess = new Date(`${dateString}T00:00:00Z`);
  const offsetMinutes = tzOffsetMinutes(utcMidnightGuess, timezone);
  return new Date(utcMidnightGuess.getTime() - offsetMinutes * 60_000).toISOString();
}

/** The UTC instant of local midnight the day after the given YYYY-MM-DD date. */
export function localDayEndIso(dateString: string, timezone: string = DEFAULT_TIMEZONE): string {
  return localDayStartIso(nextDayString(dateString), timezone);
}

/** Current wall-clock time (HH:MM:SS) in the given timezone, comparable to a Postgres `time` column. */
export function currentLocalTimeString(timezone: string = DEFAULT_TIMEZONE): string {
  return new Date().toLocaleTimeString("en-GB", { timeZone: timezone, hourCycle: "h23" });
}

/** Local time-of-day in minutes since midnight (0-1439) for an ISO timestamp, in the given timezone. */
export function localMinutesOfDay(iso: string, timezone: string = DEFAULT_TIMEZONE): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hourCycle: "h23",
    hour: "2-digit",
    minute: "2-digit",
  })
    .formatToParts(new Date(iso))
    .reduce<Record<string, string>>((acc, p) => {
      acc[p.type] = p.value;
      return acc;
    }, {});
  return Number(parts.hour) * 60 + Number(parts.minute);
}

/**
 * Whether `current` falls within [from, to] (inclusive), as HH:MM[:SS] strings.
 * Assumes from < to — does not handle windows that cross midnight.
 */
export function isTimeInWindow(current: string, from: string, to: string): boolean {
  return current >= from && current <= to;
}

/** Whole years elapsed between a YYYY-MM-DD date of birth and a YYYY-MM-DD reference date. */
export function ageInYears(dob: string, asOfDate: string): number {
  const birth = new Date(`${dob}T12:00:00`);
  const asOf = new Date(`${asOfDate}T12:00:00`);

  let age = asOf.getFullYear() - birth.getFullYear();
  const birthdayPassed =
    asOf.getMonth() > birth.getMonth() ||
    (asOf.getMonth() === birth.getMonth() && asOf.getDate() >= birth.getDate());
  if (!birthdayPassed) age -= 1;

  return age;
}
