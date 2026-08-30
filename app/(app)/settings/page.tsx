import { requireUser } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";
import { ProfileForm } from "@/components/settings/profile-form";
import { AlarmForm } from "@/components/settings/alarm-form";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>;
}) {
  const { connected, error } = await searchParams;
  const { supabase, user } = await requireUser();

  const [{ data: tokenRow }, { data: lastSync }, { data: profile }, { data: alarm }, { count: subscriptionCount }] =
    await Promise.all([
      supabase.from("google_oauth_tokens").select("updated_at").eq("user_id", user.id).maybeSingle(),
      supabase
        .from("sync_log")
        .select("started_at, finished_at, status, domains, error")
        .eq("user_id", user.id)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.from("profiles").select("date_of_birth, biological_sex").eq("user_id", user.id).maybeSingle(),
      supabase.from("alarms").select("enabled, wake_from, wake_to").eq("user_id", user.id).maybeSingle(),
      supabase.from("push_subscriptions").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    ]);

  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 px-4 py-16">
      <div>
        <p className="eyebrow mb-1">Account</p>
        <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
      </div>
      <div className="divider -mt-4" />

      {connected === "1" && (
        <p className="rounded-2xl bg-success-bg px-4 py-3 text-sm text-success">Google Health connected.</p>
      )}
      {error && (
        <p className="rounded-2xl bg-danger-bg px-4 py-3 text-sm text-danger">
          Connection failed ({error}). Please try again.
        </p>
      )}

      <section className="card flex flex-col gap-2 p-4">
        <h2 className="font-medium">Google Health</h2>
        {tokenRow ? (
          <p className="text-sm text-foreground/60">
            Connected. Last token refresh {formatDateTime(tokenRow.updated_at)}.
          </p>
        ) : (
          <p className="text-sm text-foreground/60">Not connected yet.</p>
        )}
        <a href="/api/auth/google" className="btn btn-primary mt-2 w-fit">
          {tokenRow ? "Reconnect" : "Connect Google Health"}
        </a>
      </section>

      <section className="card flex flex-col gap-2 p-4">
        <h2 className="font-medium">Last sync</h2>
        {lastSync ? (
          <div className="flex flex-col gap-1 text-sm text-foreground/60">
            <p>
              {formatDateTime(lastSync.started_at)} - {lastSync.status}
            </p>
            {lastSync.domains ? <p>{JSON.stringify(lastSync.domains)}</p> : null}
            {lastSync.error ? <p className="text-danger">{lastSync.error}</p> : null}
          </div>
        ) : (
          <p className="text-sm text-foreground/60">No syncs have run yet.</p>
        )}
      </section>

      <section className="card flex flex-col gap-2 p-4">
        <h2 className="font-medium">Profile</h2>
        <ProfileForm
          initialDateOfBirth={profile?.date_of_birth ?? null}
          initialBiologicalSex={(profile?.biological_sex as "male" | "female" | null) ?? null}
        />
      </section>

      <section className="card flex flex-col gap-2 p-4">
        <h2 className="font-medium">Smart Alarm</h2>
        <AlarmForm
          initialAlarm={
            alarm
              ? { enabled: alarm.enabled, wakeFrom: alarm.wake_from, wakeTo: alarm.wake_to }
              : null
          }
          subscriptionCount={subscriptionCount ?? 0}
        />
      </section>
    </main>
  );
}
