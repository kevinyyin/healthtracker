import { requireUser } from "@/lib/supabase/server";
import { formatDate, formatDateTime, formatDuration } from "@/lib/format";
import { EmptyState } from "@/components/empty-state";

export default async function SleepPage() {
  const { supabase, user } = await requireUser();

  const { data: sessions } = await supabase
    .from("sleep_sessions")
    .select("id, start_time, end_time, source")
    .eq("user_id", user.id)
    .order("start_time", { ascending: false })
    .limit(30);

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-16">
      <h1 className="text-2xl font-semibold">Sleep</h1>

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
                  {formatDateTime(session.start_time)} – {formatDateTime(session.end_time)}
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
