"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/server";

export interface SaveAlarmInput {
  enabled: boolean;
  wakeFrom: string;
  wakeTo: string;
}

/** Upserts the signed-in user's wake-window alarm via the session-scoped client. */
export async function saveAlarm(input: SaveAlarmInput) {
  const { supabase, user } = await requireUser();

  if (input.wakeFrom >= input.wakeTo) {
    throw new Error("Wake window must start before it ends (overnight windows aren't supported yet).");
  }

  const { error } = await supabase.from("alarms").upsert(
    {
      user_id: user.id,
      enabled: input.enabled,
      wake_from: input.wakeFrom,
      wake_to: input.wakeTo,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) throw error;

  revalidatePath("/settings");
}

export interface SavePushSubscriptionInput {
  endpoint: string;
  p256dh: string;
  auth: string;
}

/** Registers a browser's Web Push subscription for the signed-in user. */
export async function savePushSubscription(input: SavePushSubscriptionInput) {
  const { supabase, user } = await requireUser();

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: input.endpoint,
      p256dh: input.p256dh,
      auth: input.auth,
    },
    { onConflict: "user_id,endpoint" },
  );

  if (error) throw error;

  revalidatePath("/settings");
}

/** Removes a browser's Web Push subscription for the signed-in user. */
export async function deletePushSubscription(endpoint: string) {
  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", user.id)
    .eq("endpoint", endpoint);

  if (error) throw error;

  revalidatePath("/settings");
}
