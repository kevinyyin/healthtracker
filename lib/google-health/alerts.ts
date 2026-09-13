import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { todayLocalDateString } from "@/lib/date";
import { toNum } from "@/lib/numeric";
import { excludedDatesFromPeriods } from "@/lib/activity-status";
import { applyOverrides, type HealthLogOverride } from "@/lib/health-log-overrides";
import { computeRecoveryScore } from "@/lib/analytics/recovery-score";
import { computeIllnessSignal } from "@/lib/analytics/illness-signal";
import { sendPushToUser } from "@/lib/push/send";
import { shouldAlert } from "@/lib/google-health/alert-dedupe";

// Matches lib/analytics/day-strain.ts's recommendTargetStrain "Low recovery" band —
// kept as a local constant rather than a shared export (see recap.ts's own copy of
// this note): these call sites don't otherwise depend on each other.
const LOW_RECOVERY_THRESHOLD = 34;
const HEALTH_LOG_LOOKBACK = 20;

export { shouldAlert };

interface NightRow {
  date: string;
  hrv_rmssd: number | null;
  resting_hr: number | null;
  spo2: number | null;
}

/**
 * Evaluates today's Recovery/illness signal right after a sync and sends a push
 * notification if something's newly actionable — reuses the same push stack already
 * built for Smart Alarm (lib/push/send.ts, public/sw.js, push_subscriptions). Runs
 * once per syncUser() call (every 15 min via the existing cron), so each condition is
 * deduped per calendar day via google_oauth_tokens.last_illness_alert_date /
 * last_low_recovery_alert_date (mirrors alarms.last_fired_date's role).
 *
 * Never throws — a failure here must not fail the sync itself or trip syncUser's
 * consecutive-failure circuit breaker.
 */
export async function evaluateAndSendAlerts(admin: SupabaseClient, userId: string, timezone: string): Promise<void> {
  try {
    const today = todayLocalDateString(timezone);

    const [{ data: tokenRow }, { data: healthLogRows }, { data: overrideRows }, { data: statusRows }] =
      await Promise.all([
        admin
          .from("google_oauth_tokens")
          .select("last_illness_alert_date, last_low_recovery_alert_date")
          .eq("user_id", userId)
          .maybeSingle(),
        admin
          .from("health_logs")
          .select("date, hrv_rmssd, resting_hr, spo2")
          .eq("user_id", userId)
          .order("date", { ascending: false })
          .limit(HEALTH_LOG_LOOKBACK),
        admin
          .from("health_log_overrides")
          .select("date, hrv_rmssd, resting_hr, spo2, total_sleep_minutes, deep_sleep_minutes, rem_sleep_minutes, light_sleep_minutes, awake_minutes")
          .eq("user_id", userId),
        admin.from("activity_status_periods").select("status, started_on, ended_on").eq("user_id", userId),
      ]);

    const overrides: HealthLogOverride[] = (overrideRows ?? []).map((o) => ({
      date: o.date,
      hrv_rmssd: toNum(o.hrv_rmssd),
      resting_hr: toNum(o.resting_hr),
      spo2: toNum(o.spo2),
      total_sleep_minutes: toNum(o.total_sleep_minutes),
      deep_sleep_minutes: toNum(o.deep_sleep_minutes),
      rem_sleep_minutes: toNum(o.rem_sleep_minutes),
      light_sleep_minutes: toNum(o.light_sleep_minutes),
      awake_minutes: toNum(o.awake_minutes),
    }));

    const logsDescending: NightRow[] = applyOverrides(
      (healthLogRows ?? []).map((l) => ({
        date: l.date,
        hrv_rmssd: toNum(l.hrv_rmssd),
        resting_hr: toNum(l.resting_hr),
        spo2: toNum(l.spo2),
      })),
      overrides,
    );

    // No fresh night for today yet (e.g. this sync ran mid-afternoon before tonight's
    // sleep data exists) — nothing to evaluate.
    if (logsDescending.length === 0 || logsDescending[0].date !== today) return;

    const logsAscending = [...logsDescending].reverse();
    const tonight = logsDescending[0];

    const excludedDates = excludedDatesFromPeriods(statusRows ?? [], today);
    const history = logsAscending.filter((l) => l.date < today);

    const recovery = computeRecoveryScore(history, tonight, excludedDates);
    const illness = computeIllnessSignal(history, tonight, excludedDates);

    if (shouldAlert(today, tokenRow?.last_illness_alert_date ?? null, illness.flagged)) {
      await sendPushToUser(admin, userId, {
        title: "Possible illness signal",
        body: illness.reasons[0] ?? "Your recovery markers look atypical today.",
        tag: "illness-alert",
      });
      await admin.from("google_oauth_tokens").update({ last_illness_alert_date: today }).eq("user_id", userId);
    }

    const lowRecovery =
      recovery.score != null && recovery.confidence === "full" && recovery.score < LOW_RECOVERY_THRESHOLD;
    if (shouldAlert(today, tokenRow?.last_low_recovery_alert_date ?? null, lowRecovery)) {
      await sendPushToUser(admin, userId, {
        title: "Recovery is low today",
        body: `Recovery: ${Math.round(recovery.score!)}%. Consider a lighter day.`,
        tag: "low-recovery-alert",
      });
      await admin.from("google_oauth_tokens").update({ last_low_recovery_alert_date: today }).eq("user_id", userId);
    }
  } catch (err) {
    console.error("evaluateAndSendAlerts failed", err);
  }
}
