import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type UnitSystem = "metric" | "imperial";

const DEFAULT_UNIT_SYSTEM: UnitSystem = "metric";
const METERS_PER_MILE = 1609.344;

/**
 * The signed-in user's saved metric/imperial preference, falling back to metric (the
 * unit everything is already stored in, e.g. activity_sessions.distance_m) if they
 * haven't filled in a profile yet. Mirrors lib/timezone.ts's getUserTimezone exactly.
 */
export async function getUserUnitSystem(client: SupabaseClient, userId: string): Promise<UnitSystem> {
  const { data } = await client.from("profiles").select("unit_system").eq("user_id", userId).maybeSingle();
  return (data?.unit_system as UnitSystem | undefined) ?? DEFAULT_UNIT_SYSTEM;
}

/** Formats a distance in meters as "2.34 km" or "1.45 mi" depending on unit system. */
export function formatDistance(meters: number, system: UnitSystem): string {
  if (system === "imperial") {
    return `${(meters / METERS_PER_MILE).toFixed(2)} mi`;
  }
  return `${(meters / 1000).toFixed(2)} km`;
}
