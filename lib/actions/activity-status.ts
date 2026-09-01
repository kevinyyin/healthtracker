"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/server";
import { todayLocalDateString } from "@/lib/date";
import { getUserTimezone } from "@/lib/timezone";
import { isFlaggedStatus, type ActivityStatus } from "@/lib/activity-status";

/**
 * Closes any currently open status period and, unless clearing to "active", opens a
 * new one starting today.
 */
export async function setActivityStatus(status: ActivityStatus) {
  const { supabase, user } = await requireUser();
  const timezone = await getUserTimezone(supabase, user.id);
  const today = todayLocalDateString(timezone);

  const { error: closeError } = await supabase
    .from("activity_status_periods")
    .update({ ended_on: today, updated_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("ended_on", null);
  if (closeError) throw closeError;

  if (isFlaggedStatus(status)) {
    const { error: insertError } = await supabase
      .from("activity_status_periods")
      .insert({ user_id: user.id, status, started_on: today });
    if (insertError) throw insertError;
  }

  revalidatePath("/today");
  revalidatePath("/trends");
  revalidatePath("/biological-age");
}
