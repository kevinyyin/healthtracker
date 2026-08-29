import { requireUser } from "@/lib/supabase/server";
import { todayLocalDateString } from "@/lib/date";
import { summarizeSession } from "@/lib/analytics/strength";
import { formatDate } from "@/lib/format";
import { toNum } from "@/lib/numeric";
import { StrengthBuilderForm } from "@/components/strength/strength-builder-form";
import { EmptyState } from "@/components/empty-state";

export default async function StrengthPage() {
  const { supabase, user } = await requireUser();

  const { data: sets } = await supabase
    .from("strength_workouts")
    .select("id, session_id, date, exercise_name, set_number, reps, weight_kg, volume")
    .eq("user_id", user.id)
    .order("date", { ascending: false })
    .order("created_at", { ascending: true });

  const sessions = new Map<string, { date: string; sets: NonNullable<typeof sets> }>();
  for (const set of sets ?? []) {
    const existing = sessions.get(set.session_id);
    if (existing) {
      existing.sets.push(set);
    } else {
      sessions.set(set.session_id, { date: set.date, sets: [set] });
    }
  }
  const sessionList = [...sessions.entries()].sort((a, b) => (a[1].date < b[1].date ? 1 : -1));

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-16">
      <h1 className="text-2xl font-semibold">Strength</h1>

      <StrengthBuilderForm date={todayLocalDateString()} />

      <section>
        <h2 className="mb-3 font-medium">Session history</h2>
        {sessionList.length === 0 ? (
          <EmptyState title="No workouts logged yet" hint="Log your first set above to start tracking volume." />
        ) : (
          <ul className="flex flex-col gap-4">
            {sessionList.map(([sessionId, session]) => {
              const summary = summarizeSession(
                session.sets.map((s) => ({
                  exercise_name: s.exercise_name,
                  reps: s.reps,
                  weight_kg: toNum(s.weight_kg) ?? 0,
                  volume: toNum(s.volume) ?? 0,
                })),
              );
              return (
                <li key={sessionId} className="rounded border border-black/[.08] p-4 dark:border-white/[.145]">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="font-medium">{formatDate(session.date)}</p>
                    <p className="text-sm text-foreground/60">
                      {summary.totalVolume.toLocaleString()} kg volume · ~{summary.estimatedStrain.toFixed(1)} strain
                    </p>
                  </div>
                  <ul className="flex flex-col gap-1 text-sm text-foreground/70">
                    {session.sets.map((s) => (
                      <li key={s.id} className="flex justify-between">
                        <span>
                          {s.exercise_name} — set {s.set_number}
                        </span>
                        <span className="tabular-nums">
                          {s.reps} × {s.weight_kg}kg
                        </span>
                      </li>
                    ))}
                  </ul>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
