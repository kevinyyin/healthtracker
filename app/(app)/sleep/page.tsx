import { requireUser } from "@/lib/supabase/server";
import { formatDate, formatDateTime, formatDuration } from "@/lib/format";
import { toNum } from "@/lib/numeric";
import { computeSleepTarget } from "@/lib/analytics/sleep-debt";
import { SleepStageChart, type SleepStageNight } from "@/components/charts/sleep-stage-chart";
import { EmptyState } from "@/components/empty-state";

const STAGE_CHART_NIGHTS = 14;

export default async function SleepPage() {
  const { supabase, user } = await requireUser();

  const [{ data: sessions }, { data: healthLogRows }] = await Promise.all([
    supabase
      .from("sleep_sessions")
      .select("id, start_time, end_time, source")
      .eq("user_id", user.id)
      .order("start_time", { ascending: false })
      .limit(30),
    supabase
      .from("health_logs")
      .select("date, deep_sleep_minutes, rem_sleep_minutes, light_sleep_minutes, awake_minutes, total_sleep_minutes")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .limit(STAGE_CHART_NIGHTS),
  ]);

  const logs = (healthLogRows ?? []).map((l) => ({
    date: l.date,
    deep: toNum(l.deep_sleep_minutes),
    rem: toNum(l.rem_sleep_minutes),
    light: toNum(l.light_sleep_minutes),
    awake: toNum(l.awake_minutes),
    total_sleep_minutes: toNum(l.total_sleep_minutes),
  }));

  const nights: SleepStageNight[] = [...logs].reverse().map((l) => ({
    date: formatDate(l.date),
    deep: l.deep,
    rem: l.rem,
    light: l.light,
    awake: l.awake,
  }));

  const sleepTarget = computeSleepTarget(
    logs.slice(0, 3).map((l) => ({ date: l.date, total_sleep_minutes: l.total_sleep_minutes })),
    null,
  );

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-16">
      <h1 className="text-2xl font-semibold">Sleep</h1>

      {nights.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-medium">Sleep stages</h2>
            <p className="text-sm text-foreground/60">
              Sleep debt: {Math.round(sleepTarget.debtMinutes)}min · Target tonight:{" "}
              {Math.floor(sleepTarget.targetMinutes / 60)}h {Math.round(sleepTarget.targetMinutes % 60)}m
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
        <ul className="flex flex-col divide-y divide-black/[.08] dark:divide-white/[.145]">
          {sessions.map((session) => (
            <li key={session.id} className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium">{formatDate(session.start_time)}</p>
                <p className="text-sm text-foreground/60">
                  {formatDateTime(session.start_time)} - {formatDateTime(session.end_time)}
                </p>
              </div>
              <p className="text-lg font-semibold tabular-nums">
                {formatDuration(session.start_time, session.end_time)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
