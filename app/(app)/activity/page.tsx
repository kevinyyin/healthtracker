import { requireUser } from "@/lib/supabase/server";
import { formatDate, formatDuration } from "@/lib/format";
import { formatDistance, getUserUnitSystem } from "@/lib/units";
import { EmptyState } from "@/components/empty-state";

export default async function ActivityPage() {
  const { supabase, user } = await requireUser();

  const [{ data: sessions }, unitSystem] = await Promise.all([
    supabase
      .from("activity_sessions")
      .select("id, type, start_time, end_time, steps, calories, distance_m")
      .eq("user_id", user.id)
      .order("start_time", { ascending: false })
      .limit(30),
    getUserUnitSystem(supabase, user.id),
  ]);

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-16">
      <div>
        <p className="eyebrow mb-1">Exertion</p>
        <h1 className="text-3xl font-semibold tracking-tight">Activity</h1>
      </div>
      <div className="divider -mt-4" />

      {!sessions || sessions.length === 0 ? (
        <EmptyState
          title="No activity data yet"
          hint="Once your Fitbit is connected and syncing, workouts and steps will show up here."
        />
      ) : (
        <ul className="stagger-children flex flex-col divide-y divide-[var(--border)]">
          {sessions.map((session) => (
            <li key={session.id} className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium">{session.type ?? "Workout"}</p>
                <p className="text-sm text-foreground/60">{formatDate(session.start_time)}</p>
                <p className="text-sm text-foreground/60">
                  {[
                    session.steps != null ? `${session.steps} steps` : null,
                    session.calories != null ? `${session.calories} cal` : null,
                    session.distance_m != null ? formatDistance(session.distance_m, unitSystem) : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <p className="figure text-lg font-semibold">{formatDuration(session.start_time, session.end_time)}</p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
