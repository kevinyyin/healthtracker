export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Formats a date. Bare "YYYY-MM-DD" strings (e.g. from a Postgres `date` column) parse
 * as UTC midnight, which can roll back a calendar day once formatted in any timezone
 * behind UTC — so those are anchored to noon first to stay on the intended day.
 */
export function formatDate(dateOrIso: string): string {
  const value = /^\d{4}-\d{2}-\d{2}$/.test(dateOrIso) ? `${dateOrIso}T12:00:00` : dateOrIso;
  return new Date(value).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/** Formats the gap between two ISO timestamps as e.g. "7h 42m". */
export function formatDuration(startIso: string, endIso: string): string {
  const ms = new Date(endIso).getTime() - new Date(startIso).getTime();
  const totalMinutes = Math.max(0, Math.round(ms / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}
