"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/server";
import { todayLocalDateString } from "@/lib/date";
import { getUserTimezone } from "@/lib/timezone";
import { sleepStartIso } from "@/lib/health-log-overrides";

export interface SaveHealthLogOverrideInput {
  date: string;
  hrv_rmssd: number | null;
  resting_hr: number | null;
  spo2: number | null;
  total_sleep_minutes: number | null;
  deep_sleep_minutes: number | null;
  rem_sleep_minutes: number | null;
  light_sleep_minutes: number | null;
  awake_minutes: number | null;
  wake_count: number | null;
  sleep_latency_minutes: number | null;
  /** Bedtime as a raw HH:MM time-of-day (paired with `date`, the wake date being
   *  corrected) rather than a pre-built timestamp — see sleepStartIso for how the two
   *  combine. Null means "no override," same convention as every other field here. */
  sleep_start_time: string | null;
}

const FIELD_KEYS = [
  "hrv_rmssd",
  "resting_hr",
  "spo2",
  "total_sleep_minutes",
  "deep_sleep_minutes",
  "rem_sleep_minutes",
  "light_sleep_minutes",
  "awake_minutes",
  "wake_count",
  "sleep_latency_minutes",
  "sleep_start_time",
] as const;

function revalidateAffectedPaths() {
  revalidatePath("/today");
  revalidatePath("/sleep");
  revalidatePath("/trends");
  revalidatePath("/biological-age");
}

/**
 * Saves a manual correction/backfill for one date's biometrics. Fields left null
 * leave that metric un-overridden (still reads from the synced health_logs value —
 * see lib/health-log-overrides.ts). If every field is null, the row is deleted
 * instead of left as an empty override, mirroring activity_status_periods' "no row =
 * back to normal" convention.
 */
export async function saveHealthLogOverride(input: SaveHealthLogOverrideInput) {
  const { supabase, user } = await requireUser();
  const timezone = await getUserTimezone(supabase, user.id);

  const today = todayLocalDateString(timezone);
  if (input.date > today) {
    throw new Error("Can't backfill a date in the future.");
  }

  const allEmpty = FIELD_KEYS.every((key) => input[key] == null);

  if (allEmpty) {
    const { error } = await supabase
      .from("health_log_overrides")
      .delete()
      .eq("user_id", user.id)
      .eq("date", input.date);
    if (error) throw error;
    revalidateAffectedPaths();
    return;
  }

  const { error } = await supabase.from("health_log_overrides").upsert(
    {
      user_id: user.id,
      date: input.date,
      hrv_rmssd: input.hrv_rmssd,
      resting_hr: input.resting_hr,
      spo2: input.spo2,
      total_sleep_minutes: input.total_sleep_minutes,
      deep_sleep_minutes: input.deep_sleep_minutes,
      rem_sleep_minutes: input.rem_sleep_minutes,
      light_sleep_minutes: input.light_sleep_minutes,
      awake_minutes: input.awake_minutes,
      wake_count: input.wake_count,
      sleep_latency_minutes: input.sleep_latency_minutes,
      sleep_start: input.sleep_start_time ? sleepStartIso(input.date, input.sleep_start_time, timezone) : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,date" },
  );
  if (error) throw error;

  revalidateAffectedPaths();
}
