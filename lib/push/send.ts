import "server-only";
import webpush from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import { serverEnv } from "@/lib/env.server";

webpush.setVapidDetails(serverEnv.VAPID_SUBJECT, env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, serverEnv.VAPID_PRIVATE_KEY);

/**
 * Sends a Web Push notification to every device the user has subscribed on.
 * Deletes subscriptions the push service reports as gone (404/410) instead of
 * retrying them.
 */
export async function sendPushToUser(admin: SupabaseClient, userId: string, payload: object): Promise<void> {
  const { data: subscriptions, error } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userId);
  if (error) throw error;

  const body = JSON.stringify(payload);

  await Promise.allSettled(
    (subscriptions ?? []).map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth },
          },
          body,
        );
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await admin.from("push_subscriptions").delete().eq("id", subscription.id);
        } else {
          throw err;
        }
      }
    }),
  );
}
