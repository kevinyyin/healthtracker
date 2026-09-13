import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type { UnitSystem } from "@/lib/units-format";
export { formatDistance, formatWeight, toKg, fromKg } from "@/lib/units-format";

import type { UnitSystem } from "@/lib/units-format";

const DEFAULT_UNIT_SYSTEM: UnitSystem = "metric";

/**
 * The signed-in user's saved metric/imperial preference, falling back to metric (the
 * unit everything is already stored in, e.g. activity_sessions.distance_m) if they
 * haven't filled in a profile yet. Mirrors lib/timezone.ts's getUserTimezone exactly.
 */
export async function getUserUnitSystem(client: SupabaseClient, userId: string): Promise<UnitSystem> {
  const { data } = await client.from("profiles").select("unit_system").eq("user_id", userId).maybeSingle();
  return (data?.unit_system as UnitSystem | undefined) ?? DEFAULT_UNIT_SYSTEM;
}
