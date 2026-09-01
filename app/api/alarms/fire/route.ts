import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { serverEnv } from "@/lib/env.server";
import { currentLocalTimeString, DEFAULT_TIMEZONE, isTimeInWindow, todayLocalDateString } from "@/lib/date";
import { pickWakeTime } from "@/lib/alarms/schedule";
import { sendPushToUser } from "@/lib/push/send";

interface AlarmRow {
  user_id: string;
  wake_from: string;
  wake_to: string;
  last_fired_date: string | null;
}

/**
 * Fires any enabled alarm whose wake window is currently open and hasn't already
 * fired today. Intended to be invoked every minute (see .github/workflows/alarm.yml)
 * with the same `Authorization: Bearer $CRON_SECRET` header /api/sync uses.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${serverEnv.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: alarms, error } = await admin
    .from("alarms")
    .select("user_id, wake_from, wake_to, last_fired_date")
    .eq("enabled", true);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // An alarm's wake window must be compared against ITS OWN user's local time, not a
  // single global now/today — fetch every enabled alarm's user's timezone up front.
  const userIds = [...new Set((alarms ?? []).map((a: AlarmRow) => a.user_id))];
  const { data: profileRows } = await admin.from("profiles").select("user_id, timezone").in("user_id", userIds);
  const timezoneByUser = new Map((profileRows ?? []).map((p) => [p.user_id, p.timezone as string]));

  const results = await Promise.allSettled(
    (alarms ?? []).map(async (alarm: AlarmRow) => {
      const timezone = timezoneByUser.get(alarm.user_id) ?? DEFAULT_TIMEZONE;
      const now = currentLocalTimeString(timezone);
      const today = todayLocalDateString(timezone);

      if (alarm.last_fired_date === today) {
        return { user_id: alarm.user_id, fired: false, reason: "already fired today" };
      }

      const fireAt = pickWakeTime(alarm);
      if (!isTimeInWindow(now, fireAt, alarm.wake_to)) {
        return { user_id: alarm.user_id, fired: false, reason: "outside window" };
      }

      await sendPushToUser(admin, alarm.user_id, {
        title: "Wake up",
        body: "Your Smart Alarm went off.",
      });
      await admin.from("alarms").update({ last_fired_date: today }).eq("user_id", alarm.user_id);

      return { user_id: alarm.user_id, fired: true };
    }),
  );

  const summary = results.map((result) => (result.status === "fulfilled" ? result.value : { error: String(result.reason) }));

  return NextResponse.json({ checked: summary.length, results: summary });
}
