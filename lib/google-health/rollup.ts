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
  /** Mid-sleep disturbances only — excludes the pre-sleep-onset lead-in and the final
   *  wake-up, so it reflects "how often you woke up" rather than "was ever awake." */
  wakeCount: number | null;
  /** Minutes from lying down (session start) to sleep onset (first non-AWAKE stage). */
  latencyMinutes: number | null;
  /** Start of the first non-AWAKE segment and end of the last one — the "actually
   *  asleep" window, narrower than the full session span. Null together with
   *  wakeCount/latencyMinutes if the session never leaves AWAKE. */
  asleepStart: string | null;
  asleepEnd: string | null;
}

export interface StageSegment {
  type: string;
  startTime: string;
  endTime: string;
}

/** Exported for the sleep hypnogram (app/(app)/sleep/page.tsx), which re-reads the raw
 *  segments this same parser also feeds into rollup's per-stage minute totals. */
export function parseStageSegments(stageSummary: unknown): StageSegment[] {
  if (!Array.isArray(stageSummary)) return [];
  const segments: StageSegment[] = [];
  for (const entry of stageSummary) {
    if (!entry || typeof entry !== "object") continue;
    const { type, startTime, endTime } = entry as Record<string, unknown>;
    if (typeof type !== "string" || typeof startTime !== "string" || typeof endTime !== "string") continue;
    segments.push({ type, startTime, endTime });
  }
  // Defensive — the API's segment ordering isn't documented as guaranteed, even
  // though observed live data (2026-08-30) is chronological.
  return segments.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
}

/**
 * Parses Google's sleep stage_summary jsonb — an array of `{ startTime, endTime, type }`
 * stage segments (confirmed against the live API 2026-08-30: type is one of "AWAKE",
 * "LIGHT", "DEEP", "REM"). Each stage's own duration isn't provided, so it's derived
 * from its interval. Falls back to all-null stage minutes (total sleep is still computed
 * from the session's own start/end regardless) rather than throwing on an unexpected shape.
 *
 * Also derives two Sleep Score inputs from the same raw segments (see
 * lib/analytics/sleep-score.ts): wakeCount and latencyMinutes, plus the asleepStart/
 * asleepEnd window used to narrow deriveRestingHr's sample window below — all null if
 * the session never leaves AWAKE (no sleep onset to measure from).
 */
export function parseStageMinutes(stageSummary: unknown, sessionStartTime: string): StageMinutes {
  const fallback: StageMinutes = {
    deep: null,
    rem: null,
    light: null,
    awake: null,
    wakeCount: null,
    latencyMinutes: null,
    asleepStart: null,
    asleepEnd: null,
  };
  const segments = parseStageSegments(stageSummary);
  if (segments.length === 0) return fallback;

  const minutesByStage: Record<string, number> = {};
  for (const seg of segments) {
    const minutes = (new Date(seg.endTime).getTime() - new Date(seg.startTime).getTime()) / 60_000;
    const key = seg.type.toLowerCase();
    minutesByStage[key] = (minutesByStage[key] ?? 0) + minutes;
  }

  let firstAsleepIdx = -1;
  let lastAsleepIdx = -1;
  for (let i = 0; i < segments.length; i++) {
    if (segments[i].type !== "AWAKE") {
      if (firstAsleepIdx === -1) firstAsleepIdx = i;
      lastAsleepIdx = i;
    }
  }

  let wakeCount: number | null = null;
  let latencyMinutes: number | null = null;
  let asleepStart: string | null = null;
  let asleepEnd: string | null = null;
  if (firstAsleepIdx !== -1) {
    wakeCount = 0;
    for (let i = firstAsleepIdx; i <= lastAsleepIdx; i++) {
      if (segments[i].type === "AWAKE") wakeCount += 1;
    }
    const latency =
      (new Date(segments[firstAsleepIdx].startTime).getTime() - new Date(sessionStartTime).getTime()) / 60_000;
    latencyMinutes = Math.max(0, latency);
    asleepStart = segments[firstAsleepIdx].startTime;
    asleepEnd = segments[lastAsleepIdx].endTime;
  }

  if (Object.keys(minutesByStage).length === 0) {
    return { ...fallback, wakeCount, latencyMinutes, asleepStart, asleepEnd };
  }
  return {
    deep: minutesByStage.deep ?? null,
    rem: minutesByStage.rem ?? null,
    light: minutesByStage.light ?? null,
    awake: minutesByStage.awake ?? null,
    wakeCount,
    latencyMinutes,
    asleepStart,
    asleepEnd,
  };
}

function average(values: (number | null)[]): number | null {
  const nums = values.filter((v): v is number => v != null);
  if (nums.length === 0) return null;
  return nums.reduce((sum, v) => sum + v, 0) / nums.length;
}

const NAP_MERGE_GAP_MS = 60 * 60 * 1000; // 1 hour

export interface SleepSessionRow {
  id: string;
  start_time: string;
  end_time: string;
  stage_summary: unknown;
}

/** Buckets sleep_sessions rows by the local wake-date their end_time falls on. */
export function groupSessionsByDate(sessions: SleepSessionRow[], timezone: string): Map<string, SleepSessionRow[]> {
  const grouped = new Map<string, SleepSessionRow[]>();
  for (const session of sessions) {
    const date = localDateString(session.end_time, timezone);
    const bucket = grouped.get(date);
    if (bucket) bucket.push(session);
    else grouped.set(date, [session]);
  }
  return grouped;
}

/**
 * Multiple sleep_sessions can land on the same local wake-date — a nap plus the main
 * overnight sleep, or a main sleep Google split into two adjacent sessions (e.g. the
 * watch briefly disconnected). Adjacent sessions within NAP_MERGE_GAP_MS of each other
 * are treated as one continuous sleep (their stage segments get concatenated); sessions
 * farther apart are separate clusters, and the cluster with the largest start-to-end
 * span wins as "the" night — any other same-date cluster (a nap) is excluded from the
 * rollup entirely, not blended in. This is a simple, deterministic heuristic (sorted by
 * start_time, never dependent on the DB's return order — the bug this replaces) chosen
 * because this is a single-user dashboard, not a general multi-session reconciler.
 */
export function selectMainSleepCluster(sessionsForDate: SleepSessionRow[]): {
  sessions: SleepSessionRow[];
  excluded: SleepSessionRow[];
} {
  const sorted = [...sessionsForDate].sort(
    (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
  );

  const clusters: SleepSessionRow[][] = [];
  for (const session of sorted) {
    const current = clusters[clusters.length - 1];
    const gapMs = current
      ? new Date(session.start_time).getTime() - new Date(current[current.length - 1].end_time).getTime()
      : Infinity;
    if (current && gapMs <= NAP_MERGE_GAP_MS) {
      current.push(session);
    } else {
      clusters.push([session]);
    }
  }

  const span = (cluster: SleepSessionRow[]) =>
    new Date(cluster[cluster.length - 1].end_time).getTime() - new Date(cluster[0].start_time).getTime();

  let mainIdx = 0;
  for (let i = 1; i < clusters.length; i++) {
    if (span(clusters[i]) > span(clusters[mainIdx])) mainIdx = i;
  }

  const excluded = clusters.filter((_, i) => i !== mainIdx).flat();
  return { sessions: clusters[mainIdx], excluded };
}

/**
 * For the last few nights, aggregates that night's sleep session(s) + vitals_readings +
 * intraday_hr into a health_logs row. Upserts idempotently so late-arriving vitals
 * self-heal on the next sync.
 */
export async function syncNightlyRollups(admin: SupabaseClient, userId: string, timezone: string): Promise<number> {
  const since = new Date(Date.now() - ROLLUP_LOOKBACK_MS).toISOString();

  const { data: sessions } = await admin
    .from("sleep_sessions")
    .select("id, start_time, end_time, stage_summary")
    .eq("user_id", userId)
    .gte("end_time", since);

  if (!sessions || sessions.length === 0) return 0;

  const grouped = groupSessionsByDate(sessions, timezone);
  let rollupCount = 0;

  for (const [date, sessionsForDate] of grouped) {
    const { sessions: mainCluster, excluded } = selectMainSleepCluster(sessionsForDate);
    if (excluded.length > 0) {
      console.error(
        `syncNightlyRollups: excluding ${excluded.length} session(s) from ${date}'s rollup as secondary sleep (nap) — kept ${mainCluster.map((s) => s.id).join(",")} as main sleep`,
      );
    }

    const duration = (s: SleepSessionRow) => new Date(s.end_time).getTime() - new Date(s.start_time).getTime();
    const primarySession = mainCluster.reduce((longest, s) => (duration(s) > duration(longest) ? s : longest));

    const mergedStart = mainCluster[0].start_time;
    const mergedEnd = mainCluster[mainCluster.length - 1].end_time;
    const combinedStageSummary = mainCluster.flatMap((s) => (Array.isArray(s.stage_summary) ? s.stage_summary : []));

    const stages = parseStageMinutes(combinedStageSummary, mergedStart);
    const totalSleepMinutes = (new Date(mergedEnd).getTime() - new Date(mergedStart).getTime()) / 60_000;

    const [hrv, spo2, skinTemp, restingHr] = await Promise.all([
      averageVital(admin, userId, "hrv", mergedStart, mergedEnd),
      averageVital(admin, userId, "spo2", mergedStart, mergedEnd),
      averageVital(admin, userId, "skin_temp", mergedStart, mergedEnd),
      deriveRestingHr(admin, userId, stages.asleepStart ?? mergedStart, stages.asleepEnd ?? mergedEnd),
    ]);

    const { error } = await admin.from("health_logs").upsert(
      {
        user_id: userId,
        date,
        sleep_session_id: primarySession.id,
        sleep_start: mergedStart,
        sleep_end: mergedEnd,
        deep_sleep_minutes: stages.deep,
        rem_sleep_minutes: stages.rem,
        light_sleep_minutes: stages.light,
        awake_minutes: stages.awake,
        total_sleep_minutes: totalSleepMinutes,
        wake_count: stages.wakeCount,
        sleep_latency_minutes: stages.latencyMinutes,
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

/**
 * Approximates resting HR as the average of the lowest RESTING_HR_SAMPLE_COUNT
 * one-minute samples in [start, end]. Callers pass the "actually asleep" window
 * (parseStageMinutes's asleepStart/asleepEnd) rather than the full session span, so
 * the sample pool excludes pre-sleep lead-in and any awake time at the edges — only
 * the outer edges are clipped, not each mid-sleep AWAKE segment individually, since
 * that would need per-segment queries for a marginal accuracy gain on a personal
 * dashboard. A percentile-based sample count (scaling with session length) was also
 * considered and rejected: a fixed lowest-10 is already more selective on longer
 * nights, which is directionally correct, without the added complexity.
 */
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
