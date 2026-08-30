import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { localDateString } from "@/lib/date";
import { toNum } from "@/lib/numeric";

const ROLLUP_LOOKBACK_MS = 3 * 24 * 60 * 60 * 1000;
const RESTING_HR_SAMPLE_COUNT = 10;

interface StageMinutes {
  deep: number | null;
  rem: number | null;
  light: number | null;
  awake: number | null;
}

/**
 * Parses Google's sleep stage_summary jsonb — an array of `{ startTime, endTime, type }`
 * stage segments (confirmed against the live API 2026-08-30: type is one of "AWAKE",
 * "LIGHT", "DEEP", "REM"). Each stage's own duration isn't provided, so it's derived
 * from its interval. Falls back to all-null stage minutes (total sleep is still computed
 * from the session's own start/end regardless) rather than throwing on an unexpected shape.
 */
function parseStageMinutes(stageSummary: unknown): StageMinutes {
  const fallback: StageMinutes = { deep: null, rem: null, light: null, awake: null };
  if (!Array.isArray(stageSummary)) return fallback;

  const minutesByStage: Record<string, number> = {};
  for (const entry of stageSummary) {
    if (!entry || typeof entry !== "object") continue;
    const { type, startTime, endTime } = entry as Record<string, unknown>;
    if (typeof type !== "string" || typeof startTime !== "string" || typeof endTime !== "string") continue;
    const minutes = (new Date(endTime).getTime() - new Date(startTime).getTime()) / 60_000;
    const key = type.toLowerCase();
    minutesByStage[key] = (minutesByStage[key] ?? 0) + minutes;
  }

  if (Object.keys(minutesByStage).length === 0) return fallback;
  return {
    deep: minutesByStage.deep ?? null,
    rem: minutesByStage.rem ?? null,
    light: minutesByStage.light ?? null,
    awake: minutesByStage.awake ?? null,
  };
}

function average(values: (number | null)[]): number | null {
  const nums = values.filter((v): v is number => v != null);
  if (nums.length === 0) return null;
  return nums.reduce((sum, v) => sum + v, 0) / nums.length;
}

/**
 * For the last few nights, aggregates that night's sleep session + vitals_readings +
 * intraday_hr into a health_logs row. Upserts idempotently so late-arriving vitals
 * self-heal on the next sync.
 */
export async function syncNightlyRollups(admin: SupabaseClient, userId: string): Promise<number> {
  const since = new Date(Date.now() - ROLLUP_LOOKBACK_MS).toISOString();

  const { data: sessions } = await admin
    .from("sleep_sessions")
    .select("id, start_time, end_time, stage_summary")
    .eq("user_id", userId)
    .gte("end_time", since);

  if (!sessions || sessions.length === 0) return 0;

  let rollupCount = 0;

  for (const session of sessions) {
    const date = localDateString(session.end_time);
    const stages = parseStageMinutes(session.stage_summary);
    const totalSleepMinutes =
      (new Date(session.end_time).getTime() - new Date(session.start_time).getTime()) / 60_000;

    const [hrv, spo2, skinTemp, restingHr] = await Promise.all([
      averageVital(admin, userId, "hrv", session.start_time, session.end_time),
      averageVital(admin, userId, "spo2", session.start_time, session.end_time),
      averageVital(admin, userId, "skin_temp", session.start_time, session.end_time),
      deriveRestingHr(admin, userId, session.start_time, session.end_time),
    ]);

    const { error } = await admin.from("health_logs").upsert(
      {
        user_id: userId,
        date,
        sleep_session_id: session.id,
        sleep_start: session.start_time,
        sleep_end: session.end_time,
        deep_sleep_minutes: stages.deep,
        rem_sleep_minutes: stages.rem,
        light_sleep_minutes: stages.light,
        awake_minutes: stages.awake,
        total_sleep_minutes: totalSleepMinutes,
        hrv_rmssd: hrv,
        resting_hr: restingHr,
        spo2,
        skin_temp_delta: skinTemp,
        computed_at: new Date().toISOString(),
      },
      { onConflict: "user_id,date" },
    );

    if (error) throw error;
    rollupCount += 1;
  }

  return rollupCount;
}

async function averageVital(
  admin: SupabaseClient,
  userId: string,
  metricType: string,
  start: string,
  end: string,
): Promise<number | null> {
  const { data } = await admin
    .from("vitals_readings")
    .select("value")
    .eq("user_id", userId)
    .eq("metric_type", metricType)
    .gte("recorded_at", start)
    .lte("recorded_at", end);

  return average((data ?? []).map((r) => toNum(r.value)));
}

/** Approximates resting HR as the average of the lowest 10 one-minute samples during sleep. */
async function deriveRestingHr(
  admin: SupabaseClient,
  userId: string,
  start: string,
  end: string,
): Promise<number | null> {
  const { data } = await admin
    .from("intraday_hr")
    .select("bpm")
    .eq("user_id", userId)
    .gte("recorded_at", start)
    .lte("recorded_at", end)
    .order("bpm", { ascending: true })
    .limit(RESTING_HR_SAMPLE_COUNT);

  if (!data || data.length === 0) return null;
  const bpms = data.map((r) => toNum(r.bpm)).filter((v): v is number => v != null);
  if (bpms.length === 0) return null;
  return bpms.reduce((sum, v) => sum + v, 0) / bpms.length;
}
