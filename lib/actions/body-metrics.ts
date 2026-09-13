"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/server";
import { todayLocalDateString, localDateTimeToIso } from "@/lib/date";
import { getUserTimezone } from "@/lib/timezone";

const MIN_WEIGHT_KG = 20;
const MAX_WEIGHT_KG = 300;
const WEIGHT_ENTRY_TIME = "12:00"; // noon-local — one entry per calendar day, arbitrary time of day

export interface SaveWeightEntryInput {
  date: string;
  kg: number;
}

/**
 * Logs a manual weight entry — Google Health has no weight data type (see
 * lib/google-health/types.ts), so this is entirely user-authored, stored in the
 * schema-loose vitals_readings table under metric_type = 'weight'. Recorded at noon
 * local time so the existing (user_id, metric_type, recorded_at) unique constraint
 * naturally upserts one entry per calendar day — editing "today's" weight overwrites
 * today's row rather than creating a second one.
 */
export async function saveWeightEntry(input: SaveWeightEntryInput) {
  const { supabase, user } = await requireUser();
  const timezone = await getUserTimezone(supabase, user.id);

  const today = todayLocalDateString(timezone);
  if (input.date > today) {
    throw new Error("Can't log a weight entry for a future date.");
  }
  if (!Number.isFinite(input.kg) || input.kg < MIN_WEIGHT_KG || input.kg > MAX_WEIGHT_KG) {
    throw new Error("Enter a realistic weight.");
  }

  const recordedAt = localDateTimeToIso(input.date, WEIGHT_ENTRY_TIME, timezone);

  const { error } = await supabase.from("vitals_readings").upsert(
    {
      user_id: user.id,
      metric_type: "weight",
      recorded_at: recordedAt,
      value: input.kg,
      unit: "kg",
    },
    { onConflict: "user_id,metric_type,recorded_at" },
  );
  if (error) throw error;

  revalidatePath("/vitals");
}

/** Deletes a weight entry by its recorded_at timestamp (as returned from vitals_readings). */
export async function deleteWeightEntry(recordedAt: string) {
  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from("vitals_readings")
    .delete()
    .eq("user_id", user.id)
    .eq("metric_type", "weight")
    .eq("recorded_at", recordedAt);
  if (error) throw error;

  revalidatePath("/vitals");
}
