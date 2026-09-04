import { requireUser } from "@/lib/supabase/server";
import { formatDate, formatDateTime, formatDuration } from "@/lib/format";
import { toNum } from "@/lib/numeric";
import { daysBefore, todayLocalDateString } from "@/lib/date";
import { getUserTimezone } from "@/lib/timezone";
import { computeSleepTarget } from "@/lib/analytics/sleep-debt";
import { computeSleepScore, type SleepScoreFactor } from "@/lib/analytics/sleep-score";
import { excludedDatesFromPeriods } from "@/lib/activity-status";
import { applyOverrides } from "@/lib/health-log-overrides";
import { parseStageSegments } from "@/lib/google-health/rollup";
import { RING_COLORS } from "@/lib/chart-colors";
import { ScoreRing } from "@/components/score-ring";
import { MetricCard } from "@/components/metric-card";
import { SleepStageChart, type SleepStageNight } from "@/components/charts/sleep-stage-chart";
import { SleepHypnogram } from "@/components/charts/sleep-hypnogram";
import { EmptyState } from "@/components/empty-state";
import { CollapsibleSection } from "@/components/collapsible-section";

const STAGE_CHART_NIGHTS = 14;
// Wider than the stage chart's own window so the Timing factor's 14-night bedtime
// baseline (lib/analytics/sleep-score.ts) has a night of margin beyond "tonight".
const SLEEP_SCORE_HISTORY_DAYS = 20;

export default async function SleepPage() {
  const { supabase, user } = await requireUser();
  const timezone = await getUserTimezone(supabase, user.id);
  const today = todayLocalDateString(timezone);

  const [{ data: sessions }, { data: healthLogRows }, { data: overrideRows }, { data: statusRows }, { data: latestSession }] =
    await Promise.all([
      supabase
        .from("sleep_sessions")
        .select("id, start_time, end_time, source")
        .eq("user_id", user.id)
        .order("start_time", { ascending: false })
        .limit(30),
      supabase
        .from("health_logs")
        .select(
          "date, sleep_start, deep_sleep_minutes, rem_sleep_minutes, light_sleep_minutes, awake_minutes, total_sleep_minutes, wake_count, sleep_latency_minutes",
        )
        .eq("user_id", user.id)
        .order("date", { ascending: false })
        .limit(SLEEP_SCORE_HISTORY_DAYS),
      supabase
        .from("health_log_overrides")
        .select(
          "date, hrv_rmssd, resting_hr, spo2, total_sleep_minutes, deep_sleep_minutes, rem_sleep_minutes, light_sleep_minutes, awake_minutes, wake_count, sleep_latency_minutes, sleep_start",
        )
        .eq("user_id", user.id)
        .gte("date", daysBefore(today, SLEEP_SCORE_HISTORY_DAYS)),
      supabase.from("activity_status_periods").select("status, started_on, ended_on").eq("user_id", user.id),
      supabase
        .from("sleep_sessions")
        .select("start_time, end_time, stage_summary")
        .eq("user_id", user.id)
        .order("start_time", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  const excludedDates = excludedDatesFromPeriods(statusRows ?? [], today);

  const overrides = (overrideRows ?? []).map((o) => ({
    date: o.date,
    hrv_rmssd: toNum(o.hrv_rmssd),
    resting_hr: toNum(o.resting_hr),
    spo2: toNum(o.spo2),
    total_sleep_minutes: toNum(o.total_sleep_minutes),
    deep_sleep_minutes: toNum(o.deep_sleep_minutes),
    rem_sleep_minutes: toNum(o.rem_sleep_minutes),
    light_sleep_minutes: toNum(o.light_sleep_minutes),
    awake_minutes: toNum(o.awake_minutes),
    wake_count: o.wake_count as number | null,
    sleep_latency_minutes: toNum(o.sleep_latency_minutes),
    sleep_start: o.sleep_start as string | null,
  }));

  const logs = applyOverrides(
    (healthLogRows ?? []).map((l) => ({
      date: l.date,
      sleep_start: l.sleep_start as string | null,
      deep_sleep_minutes: toNum(l.deep_sleep_minutes),
      rem_sleep_minutes: toNum(l.rem_sleep_minutes),
      light_sleep_minutes: toNum(l.light_sleep_minutes),
      awake_minutes: toNum(l.awake_minutes),
      total_sleep_minutes: toNum(l.total_sleep_minutes),
      wake_count: l.wake_count as number | null,
      sleep_latency_minutes: toNum(l.sleep_latency_minutes),
    })),
    overrides,
  );

  const hypnogramSegments = latestSession ? parseStageSegments(latestSession.stage_summary) : [];

  const nights: SleepStageNight[] = [...logs]
    .slice(0, STAGE_CHART_NIGHTS)
    .reverse()
    .map((l) => ({
      date: formatDate(l.date),
      deep: l.deep_sleep_minutes,
      rem: l.rem_sleep_minutes,
      light: l.light_sleep_minutes,
      awake: l.awake_minutes,
    }));

  const sleepTarget = computeSleepTarget(
    logs.slice(0, 3).map((l) => ({ date: l.date, total_sleep_minutes: l.total_sleep_minutes })),
    null,
  );

  const tonightSleep =
    logs[0] ??
    {
      date: today,
      sleep_start: null,
      total_sleep_minutes: null,
      awake_minutes: null,
      deep_sleep_minutes: null,
      rem_sleep_minutes: null,
      wake_count: null,
      sleep_latency_minutes: null,
    };
  const sleepScoreResult = computeSleepScore(logs, tonightSleep, sleepTarget.targetMinutes, excludedDates, timezone);

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-16">
      <div>
        <p className="eyebrow mb-1">Recovery</p>
        <h1 className="text-3xl font-semibold tracking-tight">Sleep</h1>
      </div>
      <div className="divider -mt-4" />

      <div className="card flex justify-center p-6">
        <ScoreRing
          value={sleepScoreResult.score != null ? sleepScoreResult.score / 100 : null}
          display={sleepScoreResult.score != null ? `${sleepScoreResult.score}%` : "-"}
          label="Sleep Score"
          sub={
            sleepScoreResult.dataGapTonight
              ? "incomplete data tonight"
              : sleepScoreResult.confidence !== "full"
                ? "building timing baseline"
                : undefined
          }
          color={RING_COLORS.sleep}
        />
      </div>

      {sleepScoreResult.factors.some((f) => f.score != null) && (
        <section>
          <h2 className="eyebrow mb-3">Contributing factors</h2>
          <div className="stagger-children grid grid-cols-2 gap-4 sm:grid-cols-4">
            {sleepScoreResult.factors.map((f) => (
              <MetricCard
                key={f.key}
                label={f.label}
                value={f.score != null ? Math.round(f.score).toString() : "-"}
                sub={formatFactorDetail(f)}
              />
            ))}
          </div>
        </section>
      )}

      {hypnogramSegments.length > 0 && (
        <section className="card p-4">
          <h2 className="mb-3 font-medium">Last Night</h2>
          <SleepHypnogram segments={hypnogramSegments} />
        </section>
      )}

      {nights.length > 0 && (
        <section className="card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-medium">Sleep stages</h2>
            <p className="figure text-sm text-foreground/60">
              Debt {Math.round(sleepTarget.debtMinutes)}min · Target {Math.floor(sleepTarget.targetMinutes / 60)}h{" "}
              {Math.round(sleepTarget.targetMinutes % 60)}m
            </p>
          </div>
          <SleepStageChart nights={nights} />
        </section>
      )}

      {!sessions || sessions.length === 0 ? (
        <EmptyState
          title="No sleep data yet"
          hint="Once your Fitbit is connected and syncing, sleep sessions will show up here."
        />
      ) : (
        <CollapsibleSection summary={`Previous nights (${sessions.length})`}>
          <ul className="stagger-children flex flex-col divide-y divide-[var(--border)]">
            {sessions.map((session) => (
              <li key={session.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium">{formatDate(session.start_time)}</p>
                  <p className="text-sm text-foreground/60">
                    {formatDateTime(session.start_time)} - {formatDateTime(session.end_time)}
                  </p>
                </div>
                <p className="figure text-lg font-semibold">{formatDuration(session.start_time, session.end_time)}</p>
              </li>
            ))}
          </ul>
        </CollapsibleSection>
      )}
    </main>
  );
}

function formatFactorDetail(f: SleepScoreFactor): string | undefined {
  if (f.rawValue == null) return undefined;
  switch (f.key) {
    case "total_sleep": {
      const h = Math.floor(f.rawValue / 60);
      const m = Math.round(f.rawValue % 60);
      return `${h}h ${m}m in bed`;
    }
    case "efficiency":
      return `${f.rawValue.toFixed(0)}% efficiency`;
    case "restfulness": {
      const n = Math.round(f.rawValue);
      return `${n} wake-up${n === 1 ? "" : "s"}`;
    }
    case "rem":
      return `${f.rawValue.toFixed(0)}% REM`;
    case "deep":
      return `${f.rawValue.toFixed(0)}% deep`;
    case "latency":
      return `${Math.round(f.rawValue)} min to fall asleep`;
    case "timing":
      return `${Math.round(f.rawValue)} min from usual bedtime`;
  }
}
